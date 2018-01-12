
// Generate the block that are used in the game and assign unique colours to them

var i = { blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
var j = { blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
var l = { blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
var o = { blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
var s = { blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
var t = { blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
var z = { blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

// Generate a helper method that will iterate over all of the cells in the tetris grid that the piece
// will occupy

function eachblock(type, x, y, dir, fn) {
  var bit, result, row = 0, col = 0, blocks = type.blocks[dir]
  for(bit = 0x800 ; bit > 0 ; bit = bit >> 1) {
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
    nu      = 5;                                          // width/height of upcoming preview (in blocks)
