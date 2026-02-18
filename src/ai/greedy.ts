import { getSpawnPosition } from '../core/constants.js';
import { Game } from '../core/game.js';
import type { GameSnapshot, Placement } from '../core/types.js';
import { evaluate, type Weights } from './evaluator.js';
import { extractFeatures } from './features.js';
import { generatePlacements } from './placement.js';

/**
 * 1-ply greedy planner: evaluates all reachable placements for the current piece
 * (and hold piece if available) and returns the best one.
 */
export function greedySelect(snapshot: GameSnapshot, weights: Weights): Placement | null {
  const { board, currentPiece, holdPiece, holdUsed, allowHold, preview } = snapshot;
  const width = board.width;
  const height = board.totalHeight - 4; // visible height

  let bestScore = -Infinity;
  let bestPlacement: Placement | null = null;

  // Evaluate placements for the current piece
  const spawn = getSpawnPosition(currentPiece, width, height);
  const placements = generatePlacements(board, currentPiece, spawn.x, spawn.y);

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y);
    if (!sim) continue;

    const cellYs = sim.landingCells.map((c) => c.y);
    const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
    const score = evaluate(features, weights);

    if (score > bestScore) {
      bestScore = score;
      bestPlacement = { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held: false };
    }
  }

  // Evaluate placements for the hold piece (if hold is allowed and not used this turn)
  if (allowHold && !holdUsed) {
    const holdTarget = holdPiece ?? preview[0];
    if (holdTarget !== undefined) {
      const holdSpawn = getSpawnPosition(holdTarget, width, height);
      const holdPlacements = generatePlacements(board, holdTarget, holdSpawn.x, holdSpawn.y);

      for (const p of holdPlacements) {
        const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y);
        if (!sim) continue;

        const cellYs = sim.landingCells.map((c) => c.y);
        const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
        const score = evaluate(features, weights);

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held: true };
        }
      }
    }
  }

  return bestPlacement;
}
