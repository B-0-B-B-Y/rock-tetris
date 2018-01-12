// Allow communication between page and main process

const { ipcRenderer } = require('electron')

// Generate the block that are used in the game and assign unique colours to them

var i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
var j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
var l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
var o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
var s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
var t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
var z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

// Invalid Object

let invalid = {
  court: true,
  next: true,
  score: true,
  rows: true,
}

// Generate a helper method that will iterate over all of the cells in the tetris grid that the piece
// will occupy

function eachblock(type, x, y, dir, fn) {
  var bit, result, row = 0, col = 0, blocks = type.blocks[dir]
  for(bit = 0x8000;  bit > 0;  bit = bit >> 1) {
    if (blocks & bit) {
      fn(x + col, y + row)
    }
    if (++col == 4) {
      col = 0
      ++row
    }
  }
}

// Validate the proposed positioning of the piece, checking for whether the proposed placement
// is occupied by another block or the block is going out of bounds of the board

function occupied(type, x, y, dir) {
  var result = false
  eachblock(type,x, y, dir, function(x, y) {
    if((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x, y))
      result = true
  })
  return result
}

function unoccupied(type, x, y, dir) {
  return !occupied(type,x, y, dir)
}

// Randomise what piece comes next

var pieces = []
function randomPiece() {
  if (pieces.length == 0)
    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z]

  var type = pieces.splice(Math.random() * pieces.length-1, 1)[0]
  return { type: type, dir: DIR.UP, x: 2, y: 0 }
}

// Create the constants that will never change

var KEY     = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 },
    DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 },
    //stats   = new Stats(),
    canvas  = get('game'),
    ctx     = canvas.getContext('2d'),
    ucanvas = get('game-next'),
    uctx    = ucanvas.getContext('2d'),
    speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // seconds until current piece drops 1 row
    nx      = 12,                                         // width of tetris court (in blocks)
    ny      = 20,                                         // height of tetris court (in blocks)
    nu      = 2                                          // width/height of upcoming preview (in blocks)


// Create the variables that will most likely reset for every games

var height = canvas.scrollHeight,
    width  = canvas.scrollWidth

canvas.width = width
canvas.height = height

window.addEventListener('keydown', keydown)

var dx = width / nx, dy = height / ny,        // pixel size of a single tetris block
    blocks = [],        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions = [],       // queue of user actions (inputs)
    playing = true,       // true|false - game is in progress
    dt = Date.now() / 1000,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    score,         // the current score
    rows,          // number of completed rows in the current game
    step          // how long before current piece drops by 1 row
    pace = 2;

// Define get and set methods to variables

function get(id) {
  return document.getElementById(id)
}

function setScore(n) {
  score = n
  invalidateScore()
}

function addScore(n) {
  score = score + n
}

function setRows(n) {
  rows = n
  step = Math.max(speed.min, speed.start - (speed.decrement*rows))
  invalidateRows()
}

function addRows(n) {
  setRows(rows + n)
}

function getBlock(x,y) {
  return (blocks && blocks[x] ? blocks[x][y] : null)
}

function setBlock(x,y,type) {
  blocks[x] = blocks[x] || []
  blocks[x][y] = type
  invalidate()
}

function setCurrentPiece(piece) {
  current = piece || randomPiece()
  invalidate()
}

function setNextPiece(piece) {
  next = piece || randomPiece()
  invalidateNext()
}

// Create the game loop

var last, now;

setRows(12)
setCurrentPiece()
setNextPiece(randomPiece())

last = Date.now()
function frame() {
  now = Date.now()
  update((now - last) / 1000.0)
  draw()
  last = now
  requestAnimationFrame(frame, canvas)
}
frame()

// Handle the input from the keyboard

function keydown(ev) {
  if (playing) {
    switch(ev.keyCode) {
      case KEY.LEFT:  actions.push(DIR.LEFT)
      break
      case KEY.RIGHT: actions.push(DIR.RIGHT)
      break
      case KEY.UP:    actions.push(DIR.UP)
      break
      case KEY.DOWN:  actions.push(DIR.DOWN)
      break
      case KEY.ESC:   lose()
      break
    }
  }
  else if (ev.keyCode == KEY.SPACE) {
    play()
  }
}

// Handle the next user actions

function update(idt) {
  if (playing) {
    handle(actions.shift())
    dt = dt + idt
    if (dt > (step * pace)) {
      dt = dt = step
      drop()
    }
  }
}

// Handle the user input in relation to what they want to do with the pieces

function handle(action) {
  switch(action) {
    case DIR.LEFT:  move(DIR.LEFT)
    break
    case DIR.RIGHT: move(DIR.RIGHT)
    break
    case DIR.UP:    rotate()
    break
    case DIR.DOWN:  drop()
    break
  }
}

// Define the operations that can be carried out on the pieces

function move(dir) {
  var x = current.x, y = current.y
  switch(dir) {
    case DIR.RIGHT: x = x + 1
    break
    case DIR.LEFT:  x = x - 1
    break
    case DIR.DOWN:  y = y + 1
    break
  }
  if(unoccupied(current.type, x, y, current.dir)) {
    current.x = x
    current.y = y
    invalidate()
    return true
  }
  else {
    return false
  }
}

function rotate(dir) {
  var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1)
  if (unoccupied(current.type, current.x, current.y, newdir)) {
    current.dir = newdir
    invalidate()
  }
}

function drop() {
  if(!move(DIR.DOWN)) {
    addScore(10)
    dropPiece()
    removeLines()
    setCurrentPiece(next)
    setNextPiece(randomPiece())
    if (occupied(current.type, current.x, current.y, current.dir)) {
      lose()
    }
  }
}

function removeLines() {
  var x, y, complete, n = 0;
  for(y = ny ; y > 0 ; --y) {
    complete = true;
    for(x = 0 ; x < nx ; ++x) {
      if (!getBlock(x, y))
        complete = false;
    }
    if (complete) {
      removeLine(y);
      y = y + 1;
      n++;
    }
  }
  if (n > 0) {
    addRows(n);
    addScore(100*Math.pow(2,n-1));
  }
}

function removeLine(n) {
  var x, y;
  for(y = n ; y >= 0 ; --y) {
    for(x = 0 ; x < nx ; ++x)
      setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
  }
}

function dropPiece() {
  eachblock(current.type,current.x,current.y,current.dir,function(x, y) {
    setBlock(x, y, current.type)
    setCurrentPiece(next)
    setNextPiece(randomPiece())
  })
}

// Set up how the pieces are going to be rendered using the <canvas> API

function html(id, html) {
  document.getElementById(id).innerHTML = html
}

// Changable user interface will be split into 4 components:
// 1) The score
// 2) Completed row count
// 3) Next Piece preview display
// 4) The game canvas

function invalidate() {
  invalid.court = true
}

function invalidateNext() {
  invalid.next = true
}

function invalidateScore() {
  invalid.score = true
}

function invalidateRows() {
  invalid.rows = true
}

function draw() {
  ctx.save()
  ctx.lineWidth = 1
  ctx.translate(0.5, 0.5)
  //drawRows()
  drawCourt()
  drawNext()
  drawScore()
  ctx.restore()
}

function drawCourt() {
  if (invalid.court) {ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (playing)
    drawPiece(ctx, current.type, current.x, current.y, current.dir)
  var x, y, block
  for(y = 0; y < ny; y++) {
    for(x = 0; x < nx; x++) {
      if (block = getBlock(x, y))
        drawBlock(ctx, x, y, block.color)
    }
  }
  ctx.rect(0, 0, nx*dx - 1, ny*dy -1)
  ctx.stroke()   // NB: This is the court boundary
  invalid.court = false
  }
}

function drawRows() {
  for (var y = 0; y < height; y+=dy) {
    for (var x = 0; x < width; x+=dx) {
      ctx.rect(x, y, x+dx, y+dy)
      ctx.stroke()
    }
  }
}

function drawNext() {
  if (invalid.next) {
    var padding = (nu - next.type.size) / 2 // Center the piece
    uctx.save()
    uctx.translate(0.5, 0.5)
    uctx.clearRect(0, 0, nu*dx, nu*dy)
    drawPiece(uctx, next.type, padding, padding, next.dir)
    uctx.strokeStyle = 'black'
    uctx.strokeRect(0, 0, nu*dx - 1, nu*dy -1)
    uctx.restore()
    invalid.next = false
  }
}

function drawScore() {
  if (invalid.score) {
    html('score', ("00000" + Math.floor(score)).slice(-5))
    invalid.score = false
  }
}

function drawPiece(ctx, type, x, y, dir) {
  eachblock(type, x, y, dir, function(x, y) {
    drawBlock(ctx, x, y, type.color)
  })
}

function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color
  ctx.fillRect(x*dx, y*dy, dx, dy)
  ctx.strokeRect(x*dx, y*dy, dx, dy)
}

// Add functionality to the control buttons of the window

var minimise = document.getElementById('minimise');
var maximise = document.getElementById('maximise');
var close = document.getElementById('close');
var isMaximised = true;

function setupMinimiseButton(b) {
  b.addEventListener('click', function () {
    ipcRenderer.send('minimise', 'Minimise the window')
  })
}

function setupMaximiseButton(b) {
  b.addEventListener('click', function () {
    if (isMaximised) {
      isMaximised = false
      ipcRenderer.send('maximise', 'Maximise the window')
    }else {
      isMaximised = true
      ipcRenderer.send('unmaximise', 'Un-maximise the window')
    }
  })
}

function setupCloseButton(b) {
  b.addEventListener('click', function () {
    ipcRenderer.send('close', 'Close the game')
  })
}


setupMinimiseButton(minimise)
setupMaximiseButton(maximise)
setupCloseButton(close)
