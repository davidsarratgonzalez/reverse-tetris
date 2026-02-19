import { Piece, type Vec2 } from './types.js';

// Piece cell offsets for each rotation state.
// Coordinates relative to bounding box bottom-left (0,0). Y+ is up.
// PIECE_CELLS[piece][rotation] = Vec2[]
//
// Bounding boxes: I = 4×4, all others = 3×3
// Cell positions follow the Super Rotation System standard.

export const PIECE_CELLS: ReadonlyArray<ReadonlyArray<ReadonlyArray<Vec2>>> = [
  // I (4×4 bounding box)
  // R0:          R1:          R2:          R3:
  // . . . .      . . # .      . . . .      . # . .
  // # # # #      . . # .      . . . .      . # . .
  // . . . .      . . # .      # # # #      . # . .
  // . . . .      . . # .      . . . .      . # . .
  [
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  // O (3×3 bounding box, all rotations identical)
  // . # #
  // . # #
  // . . .
  [
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
  ],
  // T (3×3 bounding box)
  // R0:        R1:        R2:        R3:
  // . # .      . # .      . . .      . # .
  // # # #      . # #      # # #      # # .
  // . . .      . # .      . # .      . # .
  [
    [{ x: 1, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }],
    [{ x: 1, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
  ],
  // S (3×3 bounding box)
  // R0:        R1:        R2:        R3:
  // . # #      . # .      . . .      # . .
  // # # .      . # #      . # #      # # .
  // . . .      . . #      # # .      . # .
  [
    [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
  ],
  // Z (3×3 bounding box)
  // R0:        R1:        R2:        R3:
  // # # .      . . #      . . .      . # .
  // . # #      . # #      # # .      # # .
  // . . .      . # .      . # #      # . .
  [
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 2, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 1, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }],
  ],
  // J (3×3 bounding box)
  // R0:        R1:        R2:        R3:
  // # . .      . # #      . . .      . # .
  // # # #      . # .      # # #      . # .
  // . . .      . # .      . . #      # # .
  [
    [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }],
    [{ x: 1, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
  ],
  // L (3×3 bounding box)
  // R0:        R1:        R2:        R3:
  // . . #      . # .      . . .      # # .
  // # # #      . # .      # # #      . # .
  // . . .      . # #      # . .      . # .
  [
    [{ x: 2, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 0 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
  ],
];

// SRS wall kick offset data.
// dx, dy where Y+ is up.
// Derived from the SRS offset table: kick = src_offset - dst_offset.

// Kicks for J, L, S, T, Z pieces (first test is always (0,0))
export const JLSTZ_KICKS: Readonly<Record<string, ReadonlyArray<Vec2>>> = {
  '0>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '1>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '1>2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '2>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '2>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '3>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '3>0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '0>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
};

// Kicks for I piece (derived from SRS I-piece offset table; first test may NOT be (0,0))
export const I_KICKS: Readonly<Record<string, ReadonlyArray<Vec2>>> = {
  '0>1': [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 1 }, { x: 2, y: -2 }],
  '1>0': [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -1 }, { x: -2, y: 2 }],
  '1>2': [{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 2, y: 1 }, { x: -1, y: -1 }, { x: 2, y: 2 }],
  '2>1': [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -2, y: -1 }, { x: 1, y: 1 }, { x: -2, y: -2 }],
  '2>3': [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -1 }, { x: -2, y: 2 }],
  '3>2': [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 1 }, { x: 2, y: -2 }],
  '3>0': [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -2, y: -1 }, { x: 1, y: 1 }, { x: -2, y: -2 }],
  '0>3': [{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 2, y: 1 }, { x: -1, y: -1 }, { x: 2, y: 2 }],
};

// Bounding box width for each piece type
export const PIECE_BBOX_W: ReadonlyArray<number> = [4, 3, 3, 3, 3, 3, 3];

// Spawn position: bounding box origin (bottom-left corner) on the board.
// Guideline 2009: pieces spawn in rows 21–22 (above the skyline).
// For 3×3 pieces (T,S,Z,J,L,O): cells at rows height and height+1.
// For I (4×4): cells at row height.
// After spawning, an "initial drop" of 1 row is applied if possible (handled
// separately in Game.spawn, not here).
export function getSpawnPosition(piece: Piece, width: number, height: number): Vec2 {
  const bboxW = PIECE_BBOX_W[piece]!;
  const x = Math.floor((width - bboxW) / 2);
  // I piece: top cells at y=height (row height+1), bbox origin at height-2
  // Others: top cells at y=height+1 (row height+2), bbox origin at height-1
  const y = piece === Piece.I ? height - 2 : height - 1;
  return { x, y };
}

// NRS spawn position: pieces spawn INSIDE the visible playfield.
// Top of piece at the top visible row (height - 1).
export function getSpawnPositionNRS(piece: Piece, width: number, height: number): Vec2 {
  const bboxW = PIECE_BBOX_W[piece]!;
  const bboxH = piece === Piece.I ? 4 : 3;
  const x = Math.floor((width - bboxW) / 2);
  const y = height - bboxH;
  return { x, y };
}
