import { Board } from '../core/board.js';
import { PIECE_BBOX_W, PIECE_CELLS } from '../core/constants.js';
import { tryRotate } from '../core/srs.js';
import { Piece, Rotation } from '../core/types.js';

export interface ReachablePlacement {
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number; // lowest valid y (hard-dropped)
}

interface BfsState {
  x: number;
  y: number;
  rotation: Rotation;
}

// Encode BFS state into a single integer for fast visited-set lookup.
// x can range from about -3 to width+3 (offset by 4 to make non-negative).
// y can range from -3 to totalHeight+3 (offset by 4).
// rotation is 0-3.
function encodeState(x: number, y: number, rot: Rotation, stride: number): number {
  return ((y + 4) * stride + (x + 4)) * 4 + rot;
}

// Hard-drop: find lowest y where piece doesn't collide.
function hardDropY(board: Board, piece: Piece, rotation: Rotation, x: number, y: number): number {
  let dy = y;
  while (dy > 0 && !board.collides(piece, rotation, x, dy - 1)) {
    dy--;
  }
  // Check if dy=0 is valid
  if (dy > 0) return dy;
  return board.collides(piece, rotation, x, 0) ? dy : 0;
}

/**
 * BFS to find all reachable placements for a piece on the board.
 * Explores: move left, move right, soft drop, rotate CW, rotate CCW.
 * Returns deduplicated grounded (hard-dropped) placements.
 */
export function generatePlacements(
  board: Board,
  piece: Piece,
  spawnX: number,
  spawnY: number,
): ReachablePlacement[] {
  // If spawning collides, no placements available
  if (board.collides(piece, Rotation.R0, spawnX, spawnY)) {
    return [];
  }

  const stride = board.width + 8; // enough for x range [-4, width+3]
  const visitedSize = (board.totalHeight + 8) * stride * 4;
  const visited = new Uint8Array(visitedSize);

  // Track unique grounded placements
  const groundedKey = new Set<string>();
  const placements: ReachablePlacement[] = [];

  const queue: BfsState[] = [];
  const startState: BfsState = { x: spawnX, y: spawnY, rotation: Rotation.R0 };

  const startIdx = encodeState(startState.x, startState.y, startState.rotation, stride);
  if (startIdx >= 0 && startIdx < visitedSize) {
    visited[startIdx] = 1;
  }
  queue.push(startState);

  let head = 0;
  while (head < queue.length) {
    const s = queue[head++]!;

    // Check if grounded (can't move down)
    const canMoveDown = !board.collides(piece, s.rotation, s.x, s.y - 1);

    if (!canMoveDown) {
      // This is a grounded state — record the placement
      const key = `${s.rotation},${s.x},${s.y}`;
      if (!groundedKey.has(key)) {
        groundedKey.add(key);
        placements.push({ piece, rotation: s.rotation, x: s.x, y: s.y });
      }
    }

    // Explore soft drop
    if (canMoveDown) {
      const ny = s.y - 1;
      const idx = encodeState(s.x, ny, s.rotation, stride);
      if (idx >= 0 && idx < visitedSize && !visited[idx]) {
        visited[idx] = 1;
        queue.push({ x: s.x, y: ny, rotation: s.rotation });
      }
    }

    // Explore lateral moves
    for (const dx of [-1, 1]) {
      const nx = s.x + dx;
      if (!board.collides(piece, s.rotation, nx, s.y)) {
        const idx = encodeState(nx, s.y, s.rotation, stride);
        if (idx >= 0 && idx < visitedSize && !visited[idx]) {
          visited[idx] = 1;
          queue.push({ x: nx, y: s.y, rotation: s.rotation });
        }
      }
    }

    // Explore rotations (CW and CCW)
    for (const dir of [1, -1] as const) {
      const result = tryRotate(board, piece, s.rotation, dir, s.x, s.y);
      if (result) {
        const idx = encodeState(result.x, result.y, result.rotation, stride);
        if (idx >= 0 && idx < visitedSize && !visited[idx]) {
          visited[idx] = 1;
          queue.push({ x: result.x, y: result.y, rotation: result.rotation });
        }
      }
    }
  }

  return placements;
}

/**
 * Faster but less accurate: enumerate all non-colliding (rotation, x) combos
 * and hard-drop each. Doesn't check reachability via movement.
 */
export function generatePlacementsSimple(
  board: Board,
  piece: Piece,
): ReachablePlacement[] {
  const placements: ReachablePlacement[] = [];
  const bboxW = PIECE_BBOX_W[piece]!;
  const seen = new Set<string>();

  for (let rot = 0; rot < 4; rot++) {
    const rotation = rot as Rotation;
    // Skip duplicate rotations for O piece
    if (piece === Piece.O && rot > 0) break;

    const cells = PIECE_CELLS[piece]![rotation]!;
    // Find the range of valid x positions
    let minCellX = Infinity;
    let maxCellX = -Infinity;
    for (const c of cells) {
      if (c.x < minCellX) minCellX = c.x;
      if (c.x > maxCellX) maxCellX = c.x;
    }

    for (let x = -minCellX; x <= board.width - 1 - maxCellX; x++) {
      // Start from top and drop
      let y = board.totalHeight - 1;
      // Find a valid starting y
      while (y >= 0 && board.collides(piece, rotation, x, y)) y--;
      if (y < 0) continue;
      // Hard drop
      while (y > 0 && !board.collides(piece, rotation, x, y - 1)) y--;
      if (y > 0 || !board.collides(piece, rotation, x, 0)) {
        if (board.collides(piece, rotation, x, y - 1)) {
          // y is the grounded position
        } else {
          y = 0;
        }
      }

      const fy = hardDropY(board, piece, rotation, x, board.totalHeight - 1);
      if (board.collides(piece, rotation, x, fy)) continue;

      const key = `${rotation},${x},${fy}`;
      if (!seen.has(key)) {
        seen.add(key);
        placements.push({ piece, rotation, x, y: fy });
      }
    }
  }

  return placements;
}
