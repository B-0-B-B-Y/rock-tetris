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
    gcanvas = get('game-grid'),
    gctx    = gcanvas.getContext('2d'),
    overlay = get('game-overlay')
    speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // seconds until current piece drops 1 row
    nx      = 12,                                         // width of tetris court (in blocks)
    ny      = 20,                                         // height of tetris court (in blocks)
    nu      = 2                                          // width/height of upcoming preview (in blocks)


// Create the variables that will most likely reset for every games

// Focus game window
canvas.focus()

var height  = canvas.scrollHeight,
    width   = canvas.scrollWidth
    uheight = ucanvas.scrollHeight,
    uwidth  = ucanvas.scrollWidth

canvas.width = width
canvas.height = height

gcanvas.width = width
gcanvas.height = height

ucanvas.width = uwidth
ucanvas.height = uheight

window.addEventListener('keydown', keydown)

var dx = width / nx, dy = height / ny,        // pixel size of a single tetris block
    blocks = [],        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions = [],       // queue of user actions (inputs)
    playing = false,       // true|false - game is in progress
    dt = Date.now() / 1000,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    score = 0,         // the current score
    vscore,
    lines = 0,
    rows,          // number of completed rows in the current game
    step          // how long before current piece drops by 1 row
    pace = 2;

// Define get and set methods to variables

function get(id) {
  return document.getElementById(id)
}

function setVisualScore(n) {
  vscore = n || score
  invalidateScore()
}

function setScore(n) {
  score = n
  setVisualScore(n)
}

function addScore(n) {
  score = score + n
}

function setLines(n) {
  lines = n
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

function clearActions() {
  actions = []
}

function clearBlocks() {
  blocks = []
  invalidate()
}

function clearScore() {
  setScore(0)
  setLines(0)
}

// Create the game loop

var last, now;

setRows(12)
setCurrentPiece()
setNextPiece(randomPiece())
setVisualScore()

showOverlay('Are You Ready?', 1)

function frame() {
  now = Date.now()
  update((now - last) / 1000.0)
  draw()
  last = now
  requestAnimationFrame(frame, canvas)
}

//frame()

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
      case KEY.ESC:   lose('YOU QUIT')
      break
    }
  }
  else if (ev.keyCode == KEY.SPACE) {
    play()
  }
}

// Define play() and lose() functions

last = Date.now()
function play() {
  //hide('start')
  reset()
  playing = true
  frame()
}

function lose(text) {
  //show('start')
  setVisualScore()
  showOverlay(text)
  playing = false
}

function reset() {
  dt = 0;
  clearActions();
  clearBlocks();
  clearScore();
  setCurrentPiece(next);
  setNextPiece();
  hideOverlay()
}


// Handle the next user actions

function update(idt) {
  if (playing) {
    if (vscore < score)
      setVisualScore(vscore + 1)
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
    lines += n;
    addScore(100*Math.pow(2,n-1));
  }
}

function removeLine(n) {
  var x, y;
  for(y = n ; y >= 0 ; --y) {
    for(x = 0 ; x < nx ; ++x) {
      setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
    }
  }
}

function dropPiece() {
  var type = current.type
  eachblock(current.type,current.x,current.y,current.dir,function(x, y) {
    setBlock(x, y, type)
    setCurrentPiece(next)
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
      if (block = getBlock(x, y)) {
        drawBlock(ctx, x, y, block.color)
      }
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
      gctx.strokeStyle="#101010"
      gctx.rect(x, y, x+dx, y+dy)
      gctx.stroke()
    }
  }
}
drawRows()

function drawNext() {
  if (invalid.next) {
    var padding = (nu - next.type.size) / 2;
    uctx.save()
    uctx.translate(0.5, 0.5);
    uctx.clearRect(0, 0, uwidth, uheight)
    drawNextPiece(uctx, next.type, 2.4, 0.5, next.dir)
    uctx.restore()
    invalid.next = false
  }
}

function drawNextPiece(ctx, type, x, y, dir) {
  eachblock(type, x, y, dir, function(x, y) {
    drawNextBlock(ctx, x, y, type.color)
  })
}

function drawNextBlock(ctx, x, y, color) {
  var scale = 1.2;
  ctx.fillStyle = color
  ctx.fillRect(x*dx / scale, y*dy / scale, dx / scale, dy / scale)
  ctx.strokeRect(x*dx / scale, y*dy / scale, dx / scale, dy / scale)
}

function drawScore() {
  if (invalid.score) {
    html('score', ("00000" + Math.floor(vscore)).slice(-5))
    html('lines', lines)
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

function showOverlay(text, start) {
  overlay.className += 'visible'
  get('overlay-text').innerHTML = text || 'GAME OVER'
  if (start) {
    get('overlay-retry').innerHTML = 'Press <span class="overlay-spacebar">Spacebar</span>'
  } else {
    get('overlay-retry').innerHTML = 'Retry? => Press <span class="overlay-spacebar">Spacebar</span>'
  }
}

function hideOverlay() {
  overlay.className = ''
}

// Add functionality to the control buttons of the window

var minimise = document.getElementById('minimise');
var close = document.getElementById('close');
var isMaximised = true;

function setupMinimiseButton(b) {
  b.addEventListener('click', function () {
    ipcRenderer.send('minimise', 'Minimise the window')
  })
}

function setupCloseButton(b) {
  b.addEventListener('click', function () {
    ipcRenderer.send('close', 'Close the game')
  })
}


setupMinimiseButton(minimise)
setupCloseButton(close)


// Setup playlist

var playlist = ["assets/sound/13.Pat Benatar - We Live For Love.mp3",
"assets/sound/02.Status Quo - Rockin' All Over The World.mp3",
"assets/sound/07.Grand Funk Railroad - We're An American Band.mp3",
"assets/sound/02.Rainbow - Man On The Silver Mountain.mp3",
"assets/sound/02.Rainbow - Long Live Rock 'N' Roll.mp3",
"assets/sound/19.Paul Stanley - Tonight You Belong To Me.mp3",
"assets/sound/8.mp3",
"assets/sound/09.Uriah Heep - Easy Livin'.mp3",
"assets/sound/0.mp3",
"assets/sound/14.Peter Frampton - Baby, I Love Your Way (Live).mp3",
"assets/sound/17.The Motors - Airport.mp3",
"assets/sound/16.Raspberries - Go All The Way.mp3",
"assets/sound/17.Player - Baby Come Back.mp3",
"assets/sound/16.Pat Benatar - Heartbreaker.mp3",
"assets/sound/11.Starz - Cherry Baby.mp3",
"assets/sound/19.Hudson-Ford - Pick Up The Pieces.mp3",
"assets/sound/18.Little River Band - Reminiscing.mp3",
"assets/sound/11.Free - I'll Be Creepin'.mp3",
"assets/sound/07.Heart - Crazy On You.mp3",
"assets/sound/04.Thin Lizzy - The Boys Are Back In Town.mp3",
"assets/sound/03.Styx - Blue Collar Man (Long Nights).mp3",
"assets/sound/20.Sparks - Amateur Hour.mp3",
"assets/sound/11.Sparks - This Town Ain't Big Enough For The Both Of Us.mp3",
"assets/sound/09.Ace Frehley - New York Groove.mp3",
"assets/sound/06.Angel - Don't Leave Me Lonely.mp3",
"assets/sound/06.Bachman Turner Overdrive - Roll On Down The Highway.mp3",
"assets/sound/02.Rainbow - Since You Been Gone.mp3",
"assets/sound/12.10cc - Art For Art's Sake.mp3",
"assets/sound/07.Saga - How Long.mp3",
"assets/sound/10.Spooky Tooth - Better By You, Better Than Me.mp3",
"assets/sound/14.10cc - The Things We Do For Love.mp3",
"assets/sound/05.April Wine - Get Ready For Love.mp3",
"assets/sound/20.10cc - I Bought A Flat Guitar Tutor.mp3",
"assets/sound/03.Joe Walsh - Turn To Stone.mp3",
"assets/sound/19.Sparks - Never Turn Your Back On Mother Earth.mp3",
"assets/sound/01.Stealers Wheel - Stuck In The Middle With You.mp3",
"assets/sound/09.Rod Stewart - Every Picture Tells A Story.mp3",
"assets/sound/12.New York Dolls - Jet Boy.mp3",
"assets/sound/10.Status Quo - Mystery Song.mp3",
"assets/sound/12.April Wine - I Like To Rock.mp3",
"assets/sound/01.Budgie - In For The Kill.mp3",
"assets/sound/15.Gene Simmons - Radioactive.mp3",
"assets/sound/2.mp3",
"assets/sound/18.Wishbone Ash - Jail Bait.mp3",
"assets/sound/09.Gary Moore - Don't Believe A Word.mp3",
"assets/sound/01.Lynyrd Skynyrd - Free Bird.mp3",
"assets/sound/20.Buddy Miles - Dreams.mp3",
"assets/sound/06.Peter Frampton - Show Me The Way (Live).mp3",
"assets/sound/1.mp3",
"assets/sound/08.Diesel - Sausolito Summernight.mp3",
"assets/sound/19.Lynyrd Skynyrd - Sweet Home Alabama.mp3",
"assets/sound/03.Status Quo - Caroline.mp3",
"assets/sound/02.Status Quo - Wild Side Of Life.mp3",
"assets/sound/01.Bachman Turner Overdrive - You Ain't Seen Nothing Yet.mp3",
"assets/sound/6.mp3",
"assets/sound/21.Isaac Hayes - Theme From Shaft.mp3",
"assets/sound/14.The Motors - Forget About You.mp3",
"assets/sound/7.mp3",
"assets/sound/06.Joe Walsh - Walk Away (Live).mp3",
"assets/sound/04.10cc - Get It While You Can.mp3",
"assets/sound/13.Sammy Hagar - I've Done Everything For You.mp3",
"assets/sound/12.Raspberries - Overnight Sensation.mp3",
"assets/sound/04.Free - All Right Now.mp3",
"assets/sound/11.Pat Travers - Life In London.mp3",
"assets/sound/05.Nils Lofgren - Back It Up.mp3",
"assets/sound/06.Budgie - Bread Fan.mp3",
"assets/sound/09.Iggy Pop - Lust For Life.mp3",
"assets/sound/16.Atlanta Rhythm Section - Champagne Jam.mp3",
"assets/sound/15.38 Special - Rockin' Into The Night.mp3",
"assets/sound/15.Thin Lizzy - Sarah.mp3",
"assets/sound/19.10cc - Dreadlock Holiday.mp3",
"assets/sound/07.Wishbone Ash - Blowin' Free.mp3",
"assets/sound/4.mp3",
"assets/sound/14.T. Rex - One Inch Rock.mp3",
"assets/sound/12.The Tubes - Prime Time.mp3",
"assets/sound/03.Status Quo - Paper Plane.mp3",
"assets/sound/07.Rod Stewart - Maggie May.mp3",
"assets/sound/15.Pablo Cruise - Love Will Find A Way.mp3",
"assets/sound/08.Atlanta Rhythm Section - So Into You.mp3",
"assets/sound/05.Kiss - Do You Love Me.mp3",
"assets/sound/11.Nazareth - This Flight Tonight.mp3",
"assets/sound/10.The Knack - My Sharona.mp3",
"assets/sound/17.Strawbs - Lay Down.mp3",
"assets/sound/13.Robert Palmer - Bad Case Of Loving You (Doctor Doctor).mp3",
"assets/sound/13.Bob Welch - Sentimental Lady.mp3",
"assets/sound/08.Gary Moore - Back On The Streets.mp3",
"assets/sound/05.Kiss - Rock And Roll All Nite.mp3",
"assets/sound/16.Sparks - Something For The Girl With Everything.mp3",
"assets/sound/15.Buggles - Video Killed The Radio Star.mp3",
"assets/sound/05.Bachman Turner Overdrive - Takin' Care Of Business.mp3",
"assets/sound/16.Lynyrd Skynyrd - That Smell.mp3",
"assets/sound/18.10cc - Good Morning Judge.mp3",
"assets/sound/20.Free - Only My Soul.mp3",
"assets/sound/5.mp3",
"assets/sound/08.Cozy Powell - Theme One.mp3",
"assets/sound/04.Thin Lizzy - Whiskey In The Jar.mp3",
"assets/sound/08.T. Rex - Get It On.mp3",
"assets/sound/20.Thin Lizzy - Waiting For An Alibi.mp3",
"assets/sound/04.Thin Lizzy - Emerald.mp3",
"assets/sound/3.mp3",
"assets/sound/18.James Gang - Funk #49.mp3",
"assets/sound/01.Kiss - Detroit Rock City.mp3",
"assets/sound/10.The Runaways - Cherry Bomb.mp3",
"assets/sound/17.Nils Lofgren - Keith Don't Go (Ode To The Glimmer Twin).mp3",
"assets/sound/18.Free - My Brother Jake.mp3",
"assets/sound/10.Styx - Come Sail Away.mp3",
"assets/sound/13.Iggy Pop - The Passenger.mp3",
"assets/sound/03.Free - Wishing Well.mp3",
"assets/sound/14.Joe Walsh - Rocky Mountain Way.mp3",
"assets/sound/17.The Allman Brothers Band - Statesboro Blues.mp3"]


// Setup music player


var lastSong = null;
var selection = null;
var player = document.getElementById("audioplayer"); // Get Audio Element
player.autoplay=true;
player.addEventListener("ended", selectRandom); // Run function when song ends

function selectRandom(){
    while(selection == lastSong){ // Repeat until different song is selected
        selection = Math.floor(Math.random() * playlist.length);
    }
    lastSong = selection; // Remember last song
    player.src = playlist[selection]; // Tell HTML the location of the new Song

}

selectRandom(); // Select initial song
player.play(); // Start Song



// Add particle effects to main page


function fire() {
   $.each($(".fireeffect"), function(){
      var bubblecount = ($(this).width()/50)*10;
      for(var i = 0; i <= bubblecount; i++) {
         var size = ($.rnd(40,80)/10);
         $(this).append('<span class="particle" style="top:' + $.rnd(20,80) + '%; left:' + $.rnd(0,95) + '%;width:' + size + 'px; height:' + size + 'px;animation-delay: ' + ($.rnd(0,30)/10) + 's;"></span>');
      }
   });
}

jQuery.rnd = function(m,n) {
      m = parseInt(m);
      n = parseInt(n);
      return Math.floor( Math.random() * (n - m + 1) ) + m;
}

fire()

// Make Grid same size as game canvas
$('#game-grid').css({ "width": width, "height": height });
