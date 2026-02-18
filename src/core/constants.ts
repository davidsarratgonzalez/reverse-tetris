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
// Pieces spawn centered horizontally, with top cells at row `height` (first buffer row).
export function getSpawnPosition(piece: Piece, width: number, height: number): Vec2 {
  const bboxW = PIECE_BBOX_W[piece]!;
  const x = Math.floor((width - bboxW) / 2);
  // Top occupied cells are at y=2 (for 3×3) or y=2 (for I 4×4) in the bounding box.
  // Place them at the row just above the visible area (row = height).
  const y = height - 2;
  return { x, y };
}
