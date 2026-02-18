import { Piece, Rotation, type Placement } from '@core/types';
import { getSpawnPosition } from '@core/constants';
import { tryRotate } from '@core/srs';
import type { Board } from '@core/board';

export interface AnimationKeyframe {
  type: 'spawn' | 'move' | 'rotate' | 'drop' | 'lock';
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number;
}

/**
 * Plan a natural-looking, fully legal animation from spawn to target.
 *
 * Strategy:
 * 1. **Phased path** (most placements): rotate → move horizontally → drop.
 *    This mirrors how a human plays and looks clean.
 * 2. **BFS fallback** (tucks, T-spins, tight spaces): full BFS path-finding
 *    using the same rules as the game engine.
 *
 * All moves are validated via board.collides() and tryRotate() with SRS kicks.
 */
export function planAnimation(
  board: Board,
  placement: Placement,
  boardWidth: number,
  boardHeight: number,
): AnimationKeyframe[] {
  const piece = placement.piece;
  const spawn = getSpawnPosition(piece, boardWidth, boardHeight);

  // Try the natural phased path first, fall back to BFS
  const path =
    phasedPath(board, piece, spawn.x, spawn.y, placement.x, placement.y, placement.rotation) ??
    bfsPath(board, piece, spawn.x, spawn.y, placement.x, placement.y, placement.rotation);

  const frames: AnimationKeyframe[] = [];

  // Spawn frame
  frames.push({ type: 'spawn', piece, rotation: Rotation.R0, x: spawn.x, y: spawn.y });

  if (path.length === 0) {
    frames.push({ type: 'drop', piece, rotation: placement.rotation, x: placement.x, y: placement.y });
    frames.push({ type: 'lock', piece, rotation: placement.rotation, x: placement.x, y: placement.y });
    return frames;
  }

  // Convert every step to a keyframe (1:1, no skipping)
  for (const step of path) {
    const type = step.move === 'drop'
      ? 'drop'
      : step.move === 'left' || step.move === 'right'
        ? 'move'
        : 'rotate';
    frames.push({ type, piece, rotation: step.rot, x: step.x, y: step.y });
  }

  // Lock at final position
  frames.push({
    type: 'lock',
    piece,
    rotation: placement.rotation,
    x: placement.x,
    y: placement.y,
  });

  return frames;
}

// --- Phased path (natural-looking): rotate → move → drop ---

/**
 * Try to build a path using the natural order: rotate, then slide, then drop.
 * Returns null if any phase is blocked (caller should use BFS instead).
 */
function phasedPath(
  board: Board,
  piece: Piece,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  targetRot: Rotation,
): BfsStep[] | null {
  const steps: BfsStep[] = [];
  let x = startX;
  let y = startY;
  let rot = Rotation.R0;

  // Phase 1: Rotate to target rotation (shortest direction)
  const cwSteps = ((targetRot - rot) + 4) % 4;
  const ccwSteps = ((rot - targetRot) + 4) % 4;

  if (cwSteps <= ccwSteps) {
    for (let i = 0; i < cwSteps; i++) {
      const result = tryRotate(board, piece, rot, 1, x, y);
      if (!result) return null;
      x = result.x; y = result.y; rot = result.rotation;
      steps.push({ x, y, rot, move: 'rotateCW' });
    }
  } else {
    for (let i = 0; i < ccwSteps; i++) {
      const result = tryRotate(board, piece, rot, -1, x, y);
      if (!result) return null;
      x = result.x; y = result.y; rot = result.rotation;
      steps.push({ x, y, rot, move: 'rotateCCW' });
    }
  }

  // Phase 2: Move horizontally to target column
  while (x !== targetX) {
    const goingRight = x < targetX;
    const nx = x + (goingRight ? 1 : -1);
    if (board.collides(piece, rot, nx, y)) return null;
    x = nx;
    steps.push({ x, y, rot, move: goingRight ? 'right' : 'left' });
  }

  // Phase 3: Drop straight down to target row
  while (y !== targetY) {
    const ny = y - 1;
    if (board.collides(piece, rot, x, ny)) return null;
    y = ny;
    steps.push({ x, y, rot, move: 'drop' });
  }

  return steps;
}

// --- BFS path-finding (fallback for complex placements) ---

interface BfsNode {
  x: number;
  y: number;
  rot: Rotation;
}

interface BfsStep {
  x: number;
  y: number;
  rot: Rotation;
  move: 'left' | 'right' | 'drop' | 'rotateCW' | 'rotateCCW';
}

function encodeKey(x: number, y: number, rot: Rotation): number {
  // x in [-4, width+4], y in [-4, totalHeight+4], rot in [0,3]
  return ((y + 4) * 30 + (x + 4)) * 4 + rot;
}

function bfsPath(
  board: Board,
  piece: Piece,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  targetRot: Rotation,
): BfsStep[] {
  if (board.collides(piece, Rotation.R0, startX, startY)) {
    return [];
  }

  const targetKey = encodeKey(targetX, targetY, targetRot);

  // parent[key] = { parentKey, step } for path reconstruction
  const parent = new Map<number, { parentKey: number; step: BfsStep }>();
  const visited = new Set<number>();

  const startKey = encodeKey(startX, startY, Rotation.R0);
  visited.add(startKey);

  // Check if start IS the target
  if (startKey === targetKey) return [];

  const queue: BfsNode[] = [{ x: startX, y: startY, rot: Rotation.R0 }];
  let head = 0;

  while (head < queue.length) {
    const node = queue[head++]!;
    const nodeKey = encodeKey(node.x, node.y, node.rot);

    // Generate neighbors
    const neighbors: { n: BfsNode; step: BfsStep }[] = [];

    // Move left
    const lx = node.x - 1;
    if (!board.collides(piece, node.rot, lx, node.y)) {
      neighbors.push({
        n: { x: lx, y: node.y, rot: node.rot },
        step: { x: lx, y: node.y, rot: node.rot, move: 'left' },
      });
    }

    // Move right
    const rx = node.x + 1;
    if (!board.collides(piece, node.rot, rx, node.y)) {
      neighbors.push({
        n: { x: rx, y: node.y, rot: node.rot },
        step: { x: rx, y: node.y, rot: node.rot, move: 'right' },
      });
    }

    // Soft drop
    const dy = node.y - 1;
    if (!board.collides(piece, node.rot, node.x, dy)) {
      neighbors.push({
        n: { x: node.x, y: dy, rot: node.rot },
        step: { x: node.x, y: dy, rot: node.rot, move: 'drop' },
      });
    }

    // Rotate CW
    const cwResult = tryRotate(board, piece, node.rot, 1, node.x, node.y);
    if (cwResult) {
      neighbors.push({
        n: { x: cwResult.x, y: cwResult.y, rot: cwResult.rotation },
        step: { x: cwResult.x, y: cwResult.y, rot: cwResult.rotation, move: 'rotateCW' },
      });
    }

    // Rotate CCW
    const ccwResult = tryRotate(board, piece, node.rot, -1, node.x, node.y);
    if (ccwResult) {
      neighbors.push({
        n: { x: ccwResult.x, y: ccwResult.y, rot: ccwResult.rotation },
        step: { x: ccwResult.x, y: ccwResult.y, rot: ccwResult.rotation, move: 'rotateCCW' },
      });
    }

    for (const { n, step } of neighbors) {
      const nk = encodeKey(n.x, n.y, n.rot);
      if (visited.has(nk)) continue;
      visited.add(nk);
      parent.set(nk, { parentKey: nodeKey, step });

      if (nk === targetKey) {
        // Found target — reconstruct path
        return reconstructPath(parent, startKey, targetKey);
      }

      queue.push(n);
    }
  }

  // Target not reachable
  return [];
}

function reconstructPath(
  parent: Map<number, { parentKey: number; step: BfsStep }>,
  startKey: number,
  targetKey: number,
): BfsStep[] {
  const path: BfsStep[] = [];
  let current = targetKey;

  while (current !== startKey) {
    const entry = parent.get(current);
    if (!entry) break; // shouldn't happen
    path.push(entry.step);
    current = entry.parentKey;
  }

  path.reverse();
  return path;
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
