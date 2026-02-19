import { Piece, Rotation, type Placement, type Vec2 } from '@core/types';
import { getSpawnPosition } from '@core/constants';
import type { TryRotateFn } from '@core/rotation';
import { tryRotate } from '@core/srs';
import type { Board } from '@core/board';

export type BotInput = 'left' | 'right' | 'down' | 'rotateCW' | 'rotateCCW' | 'hardDrop' | null;

export interface AnimationKeyframe {
  type: 'spawn' | 'move' | 'rotate' | 'drop' | 'lock';
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number;
  input: BotInput;
}

/**
 * Plan a fully legal animation from spawn to target using BFS.
 *
 * BFS finds the shortest path using the same moves the game engine allows:
 * left, right, soft drop, rotate CW, rotate CCW (with SRS wall kicks).
 *
 * Every intermediate position is validated via board.collides() and tryRotate().
 */
export function planAnimation(
  board: Board,
  placement: Placement,
  boardWidth: number,
  boardHeight: number,
  rotateFn: TryRotateFn = tryRotate,
  spawnRotation: Rotation = Rotation.R0,
  spawnPosFn: (piece: Piece, width: number, height: number) => Vec2 = getSpawnPosition,
  hasHardDrop: boolean = true,
  initialDrop: boolean = false,
): AnimationKeyframe[] {
  const piece = placement.piece;
  const rawSpawn = spawnPosFn(piece, boardWidth, boardHeight);

  // Block-out check at raw spawn
  if (board.collides(piece, spawnRotation, rawSpawn.x, rawSpawn.y)) return [];

  // Apply initial drop (Guideline: piece drops 1 row before player control)
  let spawnX = rawSpawn.x;
  let spawnY = rawSpawn.y;
  if (initialDrop && !board.collides(piece, spawnRotation, spawnX, spawnY - 1)) {
    spawnY--;
  }

  const path = bfsPath(board, piece, spawnX, spawnY, placement.x, placement.y, placement.rotation, rotateFn, spawnRotation);

  const frames: AnimationKeyframe[] = [];

  // Spawn frame at effective (post-drop) position
  frames.push({ type: 'spawn', piece, rotation: spawnRotation, x: spawnX, y: spawnY, input: null });

  if (path.length === 0) {
    if (hasHardDrop) {
      frames.push({ type: 'drop', piece, rotation: placement.rotation, x: placement.x, y: placement.y, input: 'hardDrop' });
    }
    frames.push({ type: 'lock', piece, rotation: placement.rotation, x: placement.x, y: placement.y, input: null });
    return frames;
  }

  // Convert every step to a keyframe (1:1, no skipping)
  for (const step of path) {
    const type = step.move === 'drop'
      ? 'drop'
      : step.move === 'left' || step.move === 'right'
        ? 'move'
        : 'rotate';
    const input: BotInput = step.move === 'left' ? 'left'
      : step.move === 'right' ? 'right'
      : step.move === 'drop' ? 'down'
      : step.move === 'rotateCW' ? 'rotateCW'
      : 'rotateCCW';
    frames.push({ type, piece, rotation: step.rot, x: step.x, y: step.y, input });
  }

  // Lock at final position
  frames.push({
    type: 'lock',
    piece,
    rotation: placement.rotation,
    x: placement.x,
    y: placement.y,
    input: hasHardDrop ? 'hardDrop' : null,
  });

  return frames;
}

// --- BFS path-finding ---

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
  rotateFn: TryRotateFn = tryRotate,
  spawnRotation: Rotation = Rotation.R0,
): BfsStep[] {
  if (board.collides(piece, spawnRotation, startX, startY)) {
    return [];
  }

  const targetKey = encodeKey(targetX, targetY, targetRot);

  // parent[key] = { parentKey, step } for path reconstruction
  const parent = new Map<number, { parentKey: number; step: BfsStep }>();
  const visited = new Set<number>();

  const startKey = encodeKey(startX, startY, spawnRotation);
  visited.add(startKey);

  // Check if start IS the target
  if (startKey === targetKey) return [];

  const queue: BfsNode[] = [{ x: startX, y: startY, rot: spawnRotation }];
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
    const cwResult = rotateFn(board, piece, node.rot, 1, node.x, node.y);
    if (cwResult) {
      neighbors.push({
        n: { x: cwResult.x, y: cwResult.y, rot: cwResult.rotation },
        step: { x: cwResult.x, y: cwResult.y, rot: cwResult.rotation, move: 'rotateCW' },
      });
    }

    // Rotate CCW
    const ccwResult = rotateFn(board, piece, node.rot, -1, node.x, node.y);
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
