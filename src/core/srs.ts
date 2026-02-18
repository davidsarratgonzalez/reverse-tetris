import { Board } from './board.js';
import { I_KICKS, JLSTZ_KICKS } from './constants.js';
import { Piece, Rotation } from './types.js';

function getKickTable(piece: Piece): Readonly<Record<string, ReadonlyArray<{ x: number; y: number }>>> {
  if (piece === Piece.I) return I_KICKS;
  if (piece === Piece.O) return {}; // O piece has no meaningful kicks
  return JLSTZ_KICKS;
}

function rotationCW(rot: Rotation): Rotation {
  return ((rot + 1) % 4) as Rotation;
}

function rotationCCW(rot: Rotation): Rotation {
  return ((rot + 3) % 4) as Rotation;
}

export interface RotateResult {
  x: number;
  y: number;
  rotation: Rotation;
}

// Try to rotate piece. Returns new position + rotation if successful, or null.
export function tryRotate(
  board: Board,
  piece: Piece,
  fromRot: Rotation,
  direction: 1 | -1, // 1 = CW, -1 = CCW
  x: number,
  y: number,
): RotateResult | null {
  const toRot = direction === 1 ? rotationCW(fromRot) : rotationCCW(fromRot);

  // O piece: just change rotation (all states are identical)
  if (piece === Piece.O) {
    if (!board.collides(piece, toRot, x, y)) {
      return { x, y, rotation: toRot };
    }
    return null;
  }

  const key = `${fromRot}>${toRot}`;
  const kicks = getKickTable(piece)[key];
  if (!kicks) return null;

  for (const kick of kicks) {
    const nx = x + kick.x;
    const ny = y + kick.y;
    if (!board.collides(piece, toRot, nx, ny)) {
      return { x: nx, y: ny, rotation: toRot };
    }
  }

  return null;
}

export { rotationCW, rotationCCW };
