import type { Board } from './board.js';
import type { Piece, Rotation } from './types.js';
import type { RotateResult } from './srs.js';

/**
 * A rotation function signature compatible with both SRS and NRS.
 * Returns the new position/rotation if successful, or null.
 */
export type TryRotateFn = (
  board: Board,
  piece: Piece,
  fromRot: Rotation,
  direction: 1 | -1,
  x: number,
  y: number,
) => RotateResult | null;
