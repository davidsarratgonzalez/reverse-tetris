/**
 * Nintendo Rotation System (NRS) — used in NES Tetris.
 *
 * Key differences from SRS:
 * - No wall kicks: if rotated position collides, rotation fails
 * - S/Z/I pieces have only 2 rotation states (toggle)
 * - T/J/L pieces have 4 rotation states (standard cycle)
 * - O piece does not rotate
 * - Spawn rotation: T/J/L/S/Z spawn at R2 (flat-down), I/O spawn at R0
 *
 * NRS piece shapes are identical to SRS (same PIECE_CELLS table).
 */
import type { Board } from './board.js';
import { Piece, Rotation } from './types.js';
import type { RotateResult } from './srs.js';

/** NRS spawn rotation per piece type */
export const NRS_SPAWN_ROTATION: ReadonlyArray<Rotation> = [
  Rotation.R0, // I — horizontal
  Rotation.R0, // O
  Rotation.R2, // T — flat-down
  Rotation.R2, // S — horizontal
  Rotation.R2, // Z — horizontal
  Rotation.R2, // J — flat-down
  Rotation.R2, // L — flat-down
];

/**
 * Compute the next NRS rotation state.
 * S/Z/I toggle between 2 states. T/J/L cycle through 4. O stays put.
 */
function nrsNextRotation(piece: Piece, fromRot: Rotation, direction: 1 | -1): Rotation | null {
  if (piece === Piece.O) return null;

  // S/Z toggle between R1 ↔ R2
  if (piece === Piece.S || piece === Piece.Z) {
    return fromRot === Rotation.R1 ? Rotation.R2 : Rotation.R1;
  }

  // I toggles between R0 ↔ R1
  if (piece === Piece.I) {
    return fromRot === Rotation.R0 ? Rotation.R1 : Rotation.R0;
  }

  // T/J/L: standard 4-state cycle
  if (direction === 1) {
    return ((fromRot + 1) % 4) as Rotation;
  }
  return ((fromRot + 3) % 4) as Rotation;
}

/**
 * NRS rotation: no wall kicks.
 * If the rotated position collides, rotation simply fails.
 */
export function tryRotateNRS(
  board: Board,
  piece: Piece,
  fromRot: Rotation,
  direction: 1 | -1,
  x: number,
  y: number,
): RotateResult | null {
  const toRot = nrsNextRotation(piece, fromRot, direction);
  if (toRot === null) return null;

  if (!board.collides(piece, toRot, x, y)) {
    return { x, y, rotation: toRot };
  }

  return null;
}
