import { BCTS_WEIGHTS, loadWeights, saveWeights } from '../ai/weights.js';
import type { Weights } from '../ai/evaluator.js';
import { trainCrossEntropy, type CEConfig } from './cross-entropy.js';

function parseArgs(): {
  population: number;
  eliteRatio: number;
  iterations: number;
  gamesPerEval: number;
  maxPieces: number;
  noiseInit: number;
  noiseFinal: number;
  seed: number;
  randomizer: 'uniform' | 'bag7';
  previewCount: number;
  allowHold: boolean;
  output: string;
  initWeightsPath?: string;
  fromBCTS: boolean;
} {
  const args = process.argv.slice(2);
  const opts = {
    population: 100,
    eliteRatio: 0.1,
    iterations: 50,
    gamesPerEval: 30,
    maxPieces: 500_000,
    noiseInit: 4.0,
    noiseFinal: 0.0,
    seed: 42,
    randomizer: 'bag7' as 'uniform' | 'bag7',
    previewCount: 5,
    allowHold: true,
    output: 'data/weights.json',
    initWeightsPath: undefined as string | undefined,
    fromBCTS: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--population':
        opts.population = parseInt(next!, 10);
        i++;
        break;
      case '--elite-ratio':
        opts.eliteRatio = parseFloat(next!);
        i++;
        break;
      case '--iterations':
        opts.iterations = parseInt(next!, 10);
        i++;
        break;
      case '--games-per-eval':
        opts.gamesPerEval = parseInt(next!, 10);
        i++;
        break;
      case '--max-pieces':
        opts.maxPieces = parseInt(next!, 10);
        i++;
        break;
      case '--noise-init':
        opts.noiseInit = parseFloat(next!);
        i++;
        break;
      case '--noise-final':
        opts.noiseFinal = parseFloat(next!);
        i++;
        break;
      case '--seed':
        opts.seed = parseInt(next!, 10);
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
      case '--no-hold':
        opts.allowHold = false;
        break;
      case '--output':
        opts.output = next!;
        i++;
        break;
      case '--init-weights':
        opts.initWeightsPath = next;
        i++;
        break;
      case '--from-bcts':
        opts.fromBCTS = true;
        break;
    }
  }
  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs();

  let initWeights: Weights | undefined;
  if (opts.fromBCTS) {
    initWeights = BCTS_WEIGHTS;
    console.log('Starting from BCTS weights');
  } else if (opts.initWeightsPath) {
    initWeights = await loadWeights(opts.initWeightsPath);
    console.log(`Starting from weights in ${opts.initWeightsPath}`);
  }

  console.log(`\nCross-Entropy Training`);
  console.log(`Population: ${opts.population} | Elite: ${(opts.eliteRatio * 100).toFixed(0)}%`);
  console.log(`Iterations: ${opts.iterations} | Games/eval: ${opts.gamesPerEval}`);
  console.log(`Max pieces/game: ${opts.maxPieces.toLocaleString()}`);
  console.log(`Noise: ${opts.noiseInit} -> ${opts.noiseFinal}`);
  console.log(`Randomizer: ${opts.randomizer} | Hold: ${opts.allowHold} | Preview: ${opts.previewCount}`);
  console.log(`Seed: ${opts.seed}`);
  console.log('\u2500'.repeat(80));

  const ceConfig: CEConfig = {
    populationSize: opts.population,
    eliteRatio: opts.eliteRatio,
    iterations: opts.iterations,
    gamesPerEval: opts.gamesPerEval,
    maxPiecesPerGame: opts.maxPieces,
    noiseInit: opts.noiseInit,
    noiseFinal: opts.noiseFinal,
    seed: opts.seed,
    randomizer: opts.randomizer,
    previewCount: opts.previewCount,
    allowHold: opts.allowHold,
  };

  const startTime = performance.now();

  const result = trainCrossEntropy(ceConfig, initWeights, (iter) => {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(0);
    console.log(
      `Iter ${String(iter.iteration).padStart(3)}/${opts.iterations} | ` +
        `Elite mean: ${iter.eliteMean.toFixed(1).padStart(10)} | ` +
        `Best: ${iter.bestScore.toFixed(1).padStart(10)} | ` +
        `Time: ${elapsed}s`,
    );
  });

  console.log('\u2500'.repeat(80));
  console.log(`\nTraining complete in ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`Best weights: [${[...result.bestWeights].map((w) => w.toFixed(2)).join(', ')}]`);

  await saveWeights(opts.output, result.bestWeights);
  console.log(`Weights saved to ${opts.output}`);
}

main().catch(console.error);
