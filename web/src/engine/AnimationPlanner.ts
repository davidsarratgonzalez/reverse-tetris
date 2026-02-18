import { Piece, Rotation, type Placement } from '@core/types';
import { getSpawnPosition, PIECE_CELLS } from '@core/constants';
import type { Board } from '@core/board';

export interface AnimationKeyframe {
  type: 'spawn' | 'move' | 'rotate' | 'drop' | 'lock';
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number;
}

/**
 * Generates a sequence of keyframes to animate the bot's piece
 * from spawn to its final placement position.
 *
 * Strategy: spawn → rotate to target rotation → move horizontally → hard drop → lock
 */
export function planAnimation(
  board: Board,
  placement: Placement,
  boardWidth: number,
  boardHeight: number,
): AnimationKeyframe[] {
  const frames: AnimationKeyframe[] = [];
  const spawn = getSpawnPosition(placement.piece, boardWidth, boardHeight);

  let x = spawn.x;
  let y = spawn.y;
  let rot = Rotation.R0;

  // Spawn
  frames.push({ type: 'spawn', piece: placement.piece, rotation: rot, x, y });

  // Rotate to target (always CW for simplicity)
  const targetRot = placement.rotation;
  while (rot !== targetRot) {
    rot = ((rot + 1) % 4) as Rotation;
    frames.push({ type: 'rotate', piece: placement.piece, rotation: rot, x, y });
  }

  // Move horizontally to target X
  const targetX = placement.x;
  while (x !== targetX) {
    x += x < targetX ? 1 : -1;
    frames.push({ type: 'move', piece: placement.piece, rotation: rot, x, y });
  }

  // Drop to target Y (soft drop animation)
  const targetY = placement.y;
  while (y > targetY) {
    y--;
    frames.push({ type: 'drop', piece: placement.piece, rotation: rot, x, y });
  }

  // Lock
  frames.push({ type: 'lock', piece: placement.piece, rotation: rot, x, y });

  return frames;
}

/**
 * Compute ghost piece Y position (hard drop destination).
 */
export function getGhostY(
  board: Board,
  piece: Piece,
  rotation: Rotation,
  x: number,
  y: number,
): number {
  let ghostY = y;
  while (!board.collides(piece, rotation, x, ghostY - 1)) {
    ghostY--;
  }
  return ghostY;
}
