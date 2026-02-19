import { getSpawnPosition, getSpawnPositionNRS } from '../core/constants.js';
import { Game } from '../core/game.js';
import type { Board } from '../core/board.js';
import { NRS_SPAWN_ROTATION, tryRotateNRS } from '../core/nrs.js';
import type { TryRotateFn } from '../core/rotation.js';
import { tryRotate } from '../core/srs.js';
import { Piece, Rotation, type GameSnapshot, type Placement, type Vec2 } from '../core/types.js';
import { evaluate, type Weights } from './evaluator.js';
import { extractFeatures } from './features.js';
import { generatePlacements } from './placement.js';

const ALL_PIECES: Piece[] = [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L];
const PIECE_PROB = 1 / 7;

export interface ExpectimaxConfig {
  /** Search depth in placements. 1 = greedy, 2 = two-ply, 3 = three-ply. */
  depth: number;
}

/**
 * Expectimax two-piece controller.
 *
 * Observes only (board, currentPiece, nextPreview). Plans ahead `depth`
 * placements with CHANCE nodes averaging uniformly over 7 possible future
 * pieces. Only the leaf afterstates are evaluated.
 *
 * References:
 *   - Thiery & Scherrer, "Building Controllers for Tetris" (BCTS)
 *   - Gabillon et al., NIPS 2013 (D-T features, CBMPI)
 */
export function expectimaxSelect(
  snapshot: GameSnapshot,
  weights: Weights,
  config: ExpectimaxConfig = { depth: 2 },
  rotateFn?: TryRotateFn,
  spawnRotFn?: (piece: Piece) => Rotation,
  spawnPosFn?: (piece: Piece, width: number, height: number) => Vec2,
): Placement | null {
  const { board, currentPiece, preview, height } = snapshot;
  const width = board.width;
  const nextPiece: Piece | null = preview[0] ?? null;
  const doInitialDrop = snapshot.initialDrop ?? false;
  const truncAbove = snapshot.truncateLock ? height : undefined;

  // Use provided functions or resolve from snapshot
  const rFn = rotateFn ?? (snapshot.rotationSystem === 'nrs'
    ? tryRotateNRS : tryRotate);
  const srFn = spawnRotFn ?? (snapshot.rotationSystem === 'nrs'
    ? (p: Piece) => NRS_SPAWN_ROTATION[p]! : () => Rotation.R0);
  const spFn = spawnPosFn ?? (snapshot.rotationSystem === 'nrs'
    ? getSpawnPositionNRS : getSpawnPosition);

  const memo = new Map<string, number>();
  const spawnRot = srFn(currentPiece);
  const rawSpawn = spFn(currentPiece, width, height);

  // Block-out check at raw spawn
  if (board.collides(currentPiece, spawnRot, rawSpawn.x, rawSpawn.y)) return null;

  // Apply initial drop
  let spawnY = rawSpawn.y;
  if (doInitialDrop && !board.collides(currentPiece, spawnRot, rawSpawn.x, spawnY - 1)) {
    spawnY--;
  }

  const placements = generatePlacements(board, currentPiece, rawSpawn.x, spawnY, rFn, spawnRot);

  if (placements.length === 0) return null;

  let bestScore = -Infinity;
  let bestPlacement: Placement | null = null;

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y, height, truncAbove);
    if (!sim) continue;

    let value: number;

    if (config.depth <= 1 || nextPiece === null) {
      // Leaf: evaluate afterstate directly (greedy)
      const cellYs = sim.landingCells.map(c => c.y);
      const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
      value = evaluate(features, weights);
    } else {
      // CHANCE node: nextPiece becomes current, average over 7 random new previews
      value = chanceNode(sim.board, nextPiece, config.depth - 1, weights, width, height, memo, rFn, srFn, spFn, doInitialDrop, truncAbove);
    }

    if (value > bestScore) {
      bestScore = value;
      bestPlacement = { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held: false };
    }
  }

  return bestPlacement;
}

/**
 * CHANCE node: average the MAX node value over all 7 possible next preview pieces.
 * currentPiece is what will be placed next (the old preview).
 */
function chanceNode(
  board: Board,
  currentPiece: Piece,
  depth: number,
  weights: Weights,
  width: number,
  height: number,
  memo: Map<string, number>,
  rotateFn: TryRotateFn,
  spawnRotFn: (piece: Piece) => Rotation,
  spawnPosFn: (piece: Piece, width: number, height: number) => Vec2,
  initialDrop: boolean,
  truncAbove: number | undefined,
): number {
  let expected = 0;
  for (const nextPiece of ALL_PIECES) {
    expected += PIECE_PROB * maxNode(board, currentPiece, nextPiece, depth, weights, width, height, memo, rotateFn, spawnRotFn, spawnPosFn, initialDrop, truncAbove);
  }
  return expected;
}

/**
 * MAX node: pick the best placement of `currentPiece` given known `nextPiece`.
 */
function maxNode(
  board: Board,
  currentPiece: Piece,
  nextPiece: Piece,
  depth: number,
  weights: Weights,
  width: number,
  height: number,
  memo: Map<string, number>,
  rotateFn: TryRotateFn,
  spawnRotFn: (piece: Piece) => Rotation,
  spawnPosFn: (piece: Piece, width: number, height: number) => Vec2,
  initialDrop: boolean,
  truncAbove: number | undefined,
): number {
  const key = `${board.hash()}_${currentPiece}_${nextPiece}_${depth}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const spawnRot = spawnRotFn(currentPiece);
  const rawSpawn = spawnPosFn(currentPiece, width, height);

  // Block-out check
  if (board.collides(currentPiece, spawnRot, rawSpawn.x, rawSpawn.y)) {
    memo.set(key, -1e9);
    return -1e9;
  }

  // Apply initial drop
  let spawnY = rawSpawn.y;
  if (initialDrop && !board.collides(currentPiece, spawnRot, rawSpawn.x, spawnY - 1)) {
    spawnY--;
  }

  const placements = generatePlacements(board, currentPiece, rawSpawn.x, spawnY, rotateFn, spawnRot);

  let best = -Infinity;

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y, height, truncAbove);
    if (!sim) continue;

    let value: number;

    if (depth <= 1) {
      // Leaf: evaluate this afterstate
      const cellYs = sim.landingCells.map(c => c.y);
      const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
      value = evaluate(features, weights);
    } else {
      // Recurse: CHANCE → MAX → ...
      value = chanceNode(sim.board, nextPiece, depth - 1, weights, width, height, memo, rotateFn, spawnRotFn, spawnPosFn, initialDrop, truncAbove);
    }

    if (value > best) best = value;
  }

  // No valid placements → terminal
  if (best === -Infinity) best = -1e9;

  memo.set(key, best);
  return best;
}
