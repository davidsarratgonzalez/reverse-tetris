import { Game } from '../core/game.js';
import type { GameConfig, Placement } from '../core/types.js';
import { expectimaxSelect, type ExpectimaxConfig } from '../ai/expectimax.js';
import { greedySelect } from '../ai/greedy.js';
import type { Weights } from '../ai/evaluator.js';
import { computeStats, type BenchmarkStats } from './stats.js';

export interface BenchmarkConfig {
  games: number;
  planner: 'greedy' | 'expectimax';
  expectimaxDepth: number;
  randomizer: 'uniform' | 'bag7';
  previewCount: number;
  allowHold: boolean;
  weights: Weights;
  seed: number;
  maxPiecesPerGame: number;
}

export interface BenchmarkResult {
  lineStats: BenchmarkStats;
  pieceStats: BenchmarkStats;
  decisionTimeStats: BenchmarkStats;
  totalTimeMs: number;
  gamesCompleted: number;
}

export function runBenchmark(
  config: BenchmarkConfig,
  onProgress?: (completed: number, total: number) => void,
): BenchmarkResult {
  const lineResults: number[] = [];
  const pieceResults: number[] = [];
  const decisionTimes: number[] = [];
  const startTime = performance.now();

  const expectimaxConfig: ExpectimaxConfig = { depth: config.expectimaxDepth };

  for (let g = 0; g < config.games; g++) {
    const gameConfig: Partial<GameConfig> = {
      randomizer: config.randomizer,
      previewCount: config.previewCount,
      allowHold: config.allowHold,
      seed: config.seed + g,
    };

    const game = new Game(gameConfig);

    while (!game.gameOver && game.piecesPlaced < config.maxPiecesPerGame) {
      const snapshot = game.snapshot();
      const decStart = performance.now();

      let placement: Placement | null;
      if (config.planner === 'expectimax') {
        placement = expectimaxSelect(snapshot, config.weights, expectimaxConfig);
      } else {
        placement = greedySelect(snapshot, config.weights);
      }

      decisionTimes.push(performance.now() - decStart);

      if (!placement) break;
      game.applyPlacement(placement);
    }

    lineResults.push(game.linesCleared);
    pieceResults.push(game.piecesPlaced);

    if (onProgress) {
      onProgress(g + 1, config.games);
    }
  }

  return {
    lineStats: computeStats(lineResults),
    pieceStats: computeStats(pieceResults),
    decisionTimeStats: computeStats(decisionTimes),
    totalTimeMs: performance.now() - startTime,
    gamesCompleted: config.games,
  };
}
