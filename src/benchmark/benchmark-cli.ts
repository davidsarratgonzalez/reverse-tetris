import type { Weights } from '../ai/evaluator.js';
import { BCTS_WEIGHTS, loadWeights } from '../ai/weights.js';
import { formatStats } from './stats.js';
import { runBenchmark, type BenchmarkConfig } from './runner.js';

function parseArgs(): {
  games: number;
  planner: 'greedy' | 'expectimax';
  expectimaxDepth: number;
  randomizer: 'uniform' | 'bag7';
  previewCount: number;
  allowHold: boolean;
  maxPieces: number;
  seed: number;
  weightsPath?: string;
} {
  const args = process.argv.slice(2);
  const opts = {
    games: 100,
    planner: 'greedy' as 'greedy' | 'expectimax',
    expectimaxDepth: 2,
    randomizer: 'bag7' as 'uniform' | 'bag7',
    previewCount: 1,
    allowHold: false,
    maxPieces: 500_000,
    seed: 0,
    weightsPath: undefined as string | undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--games':
        opts.games = parseInt(next!, 10);
        i++;
        break;
      case '--planner':
        opts.planner = next as 'greedy' | 'expectimax';
        i++;
        break;
      case '--depth':
        opts.expectimaxDepth = parseInt(next!, 10);
        i++;
        break;
      case '--randomizer':
        opts.randomizer = next as 'uniform' | 'bag7';
        i++;
        break;
      case '--preview':
        opts.previewCount = parseInt(next!, 10);
        i++;
        break;
      case '--hold':
        opts.allowHold = true;
        break;
      case '--max-pieces':
        opts.maxPieces = parseInt(next!, 10);
        i++;
        break;
      case '--seed':
        opts.seed = parseInt(next!, 10);
        i++;
        break;
      case '--weights':
        opts.weightsPath = next;
        i++;
        break;
    }
  }
  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs();
  let weights: Weights = BCTS_WEIGHTS;
  if (opts.weightsPath) {
    weights = await loadWeights(opts.weightsPath);
  }

  const plannerDesc =
    opts.planner === 'expectimax'
      ? `expectimax(depth=${opts.expectimaxDepth})`
      : 'greedy';

  console.log(`\nBenchmark: ${opts.games} games | ${plannerDesc} | ${opts.randomizer}`);
  console.log(
    `Hold: ${opts.allowHold} | Preview: ${opts.previewCount} | Max pieces: ${opts.maxPieces.toLocaleString()} | Seed: ${opts.seed}`,
  );
  console.log('\u2500'.repeat(80));

  const config: BenchmarkConfig = {
    games: opts.games,
    planner: opts.planner,
    expectimaxDepth: opts.expectimaxDepth,
    randomizer: opts.randomizer,
    previewCount: opts.previewCount,
    allowHold: opts.allowHold,
    weights,
    seed: opts.seed,
    maxPiecesPerGame: opts.maxPieces,
  };

  const result = runBenchmark(config, (completed, total) => {
    process.stdout.write(`\rProgress: ${completed}/${total} games`);
  });

  console.log('\n' + '\u2500'.repeat(80));
  console.log(formatStats(result.lineStats, 'Lines cleared:'));
  console.log(formatStats(result.pieceStats, 'Pieces placed:'));
  console.log(formatStats(result.decisionTimeStats, 'Decision time (ms):'));
  console.log(
    `\nTotal time: ${(result.totalTimeMs / 1000).toFixed(1)}s | Throughput: ${(
      (result.pieceStats.mean * result.gamesCompleted) /
      (result.totalTimeMs / 1000)
    ).toFixed(0)} moves/s`,
  );
}

main().catch(console.error);
