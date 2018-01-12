
// Generate the block that are used in the game and assign unique colours to them

var i = { blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   }
var j = { blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   }
var l = { blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' }
var o = { blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' }
var s = { blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  }
var t = { blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' }
var z = { blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    }

// Generate a helper method that will iterate over all of the cells in the tetris grid that the piece
// will occupy

function eachblock(type, x, y, dir, fn) {
  var bit, result, row = 0, col = 0, blocks = type.blocks[dir]
  for(bit = 0x800;  bit > 0;  bit = bit >> 1) {
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
  var type = pieces.splice(random(0, pieces.length-1), 1)[0]
  return { type: type, dir: DIR.UP, x: 2, y: 0 }
}

// Create the constants that will never change

var KEY     = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 },
    DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 },
    stats   = new Stats(),
    canvas  = get('canvas'),
    ctx     = canvas.getContext('2d'),
    ucanvas = get('upcoming'),
    uctx    = ucanvas.getContext('2d'),
    speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // seconds until current piece drops 1 row
    nx      = 10,                                         // width of tetris court (in blocks)
    ny      = 20,                                         // height of tetris court (in blocks)
    nu      = 5                                          // width/height of upcoming preview (in blocks)


// Create the variables that will most likely reset for every games

var dx, dy,        // pixel size of a single tetris block
    blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions,       // queue of user actions (inputs)
    playing,       // true|false - game is in progress
    dt,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    score,         // the current score
    rows,          // number of completed rows in the current game
    step          // how long before current piece drops by 1 row

// Define get and set methods to variables

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

var last = now = timestamp()
function frame() {
  now = timestamp()
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
    if (dt > step) {
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

function dropPiece() {
  eachblock(current.type,current.x,current.y,current.dir,function(x, y) {
    setBlock(x, y, current.type)
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

var invalid = {}

function invalidate() {
  invalid.court = true
}

function invalidateNext() {
  invalid.next = true
}

function invalidateScore() {
  invalid.score = true
}
