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

// CVaR(α=0.30): average the worst 30% of outcomes.
// In reverse-tetris the human picks adversarially, so the bot should be pessimistic.
const CVAR_ALPHA = 0.30;

export interface ExpectimaxConfig {
  /** Search depth in placements. 1 = greedy, 2 = two-ply, 3 = three-ply. */
  depth: number;
}

/** Candidate afterstate for dominance pruning. */
interface AfterState {
  placement: Placement;
  board: Board;
  leafScore: number;
  holes: number;
  maxH: number;
}

/**
 * Dominance-lite pruning: remove placements that are strictly worse
 * than another on all quick metrics (holes, maxHeight, leafScore).
 * Typically reduces ~34 candidates to ~15-20, making depth 3 feasible.
 */
function dominancePrune(candidates: AfterState[]): AfterState[] {
  // Sort by leaf score descending for early filtering
  candidates.sort((a, b) => b.leafScore - a.leafScore);
  const kept: AfterState[] = [];
  for (const c of candidates) {
    const dominated = kept.some(k =>
      k.holes <= c.holes && k.maxH <= c.maxH && k.leafScore >= c.leafScore
    );
    if (!dominated) kept.push(c);
  }
  return kept;
}

/**
 * Expectimax controller with CVaR chance aggregation and dominance pruning.
 *
 * Plans ahead `depth` placements with CHANCE nodes using CVaR(α=0.30)
 * to model adversarial piece selection. Dominance pruning reduces the
 * branching factor, making depth 3 feasible.
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

  // Phase 1: Evaluate all placements greedily (leaf score + quick metrics)
  let candidates: AfterState[] = [];
  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y, height, truncAbove);
    if (!sim) continue;

    const cellYs = sim.landingCells.map(c => c.y);
    const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
    const leafScore = evaluate(features, weights);

    candidates.push({
      placement: { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held: false },
      board: sim.board,
      leafScore,
      holes: features.holes,
      maxH: features.maxHeight,
    });
  }

  if (candidates.length === 0) return null;

  // Phase 2: For greedy (depth ≤ 1) or no preview, just return best leaf
  if (config.depth <= 1 || nextPiece === null) {
    let best: AfterState | null = null;
    for (const c of candidates) {
      if (!best || c.leafScore > best.leafScore) best = c;
    }
    return best?.placement ?? null;
  }

  // Phase 3: Dominance pruning before expensive deep search
  candidates = dominancePrune(candidates);

  // Phase 4: Deep search on surviving candidates
  let bestScore = -Infinity;
  let bestPlacement: Placement | null = null;

  for (const c of candidates) {
    const value = chanceNode(c.board, nextPiece, config.depth - 1, weights, width, height, memo, rFn, srFn, spFn, doInitialDrop, truncAbove);

    if (value > bestScore) {
      bestScore = value;
      bestPlacement = c.placement;
    }
  }

  return bestPlacement;
}

/**
 * CHANCE node: CVaR aggregation over all 7 possible next preview pieces.
 * Instead of arithmetic mean (which assumes uniform random), CVaR(α) averages
 * only the worst α fraction of outcomes — modeling adversarial piece selection.
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
  const values: number[] = [];
  for (const nextPiece of ALL_PIECES) {
    values.push(maxNode(board, currentPiece, nextPiece, depth, weights, width, height, memo, rotateFn, spawnRotFn, spawnPosFn, initialDrop, truncAbove));
  }

  // CVaR: average the worst α fraction
  values.sort((a, b) => a - b); // ascending — worst first
  const k = CVAR_ALPHA * values.length; // 0.30 * 7 = 2.1
  const fullCount = Math.floor(k);       // 2
  const fractional = k - fullCount;       // 0.1

  let sum = 0;
  for (let i = 0; i < fullCount; i++) {
    sum += values[i]!;
  }
  if (fractional > 0 && fullCount < values.length) {
    sum += fractional * values[fullCount]!;
  }

  return sum / k;
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
