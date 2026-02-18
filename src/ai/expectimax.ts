import { getSpawnPosition } from '../core/constants.js';
import { Game } from '../core/game.js';
import type { Board } from '../core/board.js';
import { Piece, type GameSnapshot, type Placement } from '../core/types.js';
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
): Placement | null {
  const { board, currentPiece, preview } = snapshot;
  const width = board.width;
  const height = board.totalHeight - 4; // visible height
  const nextPiece: Piece | null = preview[0] ?? null;

  const memo = new Map<string, number>();
  const spawn = getSpawnPosition(currentPiece, width, height);
  const placements = generatePlacements(board, currentPiece, spawn.x, spawn.y);

  if (placements.length === 0) return null;

  let bestScore = -Infinity;
  let bestPlacement: Placement | null = null;

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y);
    if (!sim) continue;

    let value: number;

    if (config.depth <= 1 || nextPiece === null) {
      // Leaf: evaluate afterstate directly (greedy)
      const cellYs = sim.landingCells.map(c => c.y);
      const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
      value = evaluate(features, weights);
    } else {
      // CHANCE node: nextPiece becomes current, average over 7 random new previews
      value = chanceNode(sim.board, nextPiece, config.depth - 1, weights, width, height, memo);
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
): number {
  let expected = 0;
  for (const nextPiece of ALL_PIECES) {
    expected += PIECE_PROB * maxNode(board, currentPiece, nextPiece, depth, weights, width, height, memo);
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
): number {
  const key = `${board.hash()}_${currentPiece}_${nextPiece}_${depth}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const spawn = getSpawnPosition(currentPiece, width, height);
  const placements = generatePlacements(board, currentPiece, spawn.x, spawn.y);

  let best = -Infinity;

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y);
    if (!sim) continue;

    let value: number;

    if (depth <= 1) {
      // Leaf: evaluate this afterstate
      const cellYs = sim.landingCells.map(c => c.y);
      const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
      value = evaluate(features, weights);
    } else {
      // Recurse: CHANCE → MAX → ...
      value = chanceNode(sim.board, nextPiece, depth - 1, weights, width, height, memo);
    }

    if (value > best) best = value;
  }

  // No valid placements → terminal
  if (best === -Infinity) best = -1e9;

  memo.set(key, best);
  return best;
}
