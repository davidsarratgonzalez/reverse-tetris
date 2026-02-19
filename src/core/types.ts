export enum Piece {
  I = 0,
  O = 1,
  T = 2,
  S = 3,
  Z = 4,
  J = 5,
  L = 6,
}

export const PIECE_COUNT = 7;

export enum Rotation {
  R0 = 0, // spawn
  R1 = 1, // CW
  R2 = 2, // 180
  R3 = 3, // CCW
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Placement {
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number;
  held: boolean;
}

export interface FeatureVector {
  landingHeight: number;
  erodedPieceCells: number;
  rowTransitions: number;
  colTransitions: number;
  holes: number;
  cumulativeWells: number;
  holeDepth: number;
  rowsWithHoles: number;
}

export interface GameConfig {
  width: number;
  height: number;
  bufferRows: number;
  previewCount: number;
  randomizer: 'uniform' | 'bag7';
  allowHold: boolean;
  seed: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  width: 10,
  height: 20,
  bufferRows: 20, // Guideline: 20 buffer rows above visible area (total 40)
  previewCount: 5,
  randomizer: 'bag7',
  allowHold: true,
  seed: 0,
};

export interface LockResult {
  linesCleared: number;
  pieceCellsInCleared: number;
  gameOver: boolean;
}

export interface GameSnapshot {
  board: import('./board.js').Board;
  height: number; // visible playfield height (without buffer rows)
  currentPiece: Piece;
  holdPiece: Piece | null;
  holdUsed: boolean;
  allowHold: boolean;
  preview: Piece[];
  linesCleared: number;
  piecesPlaced: number;
}
