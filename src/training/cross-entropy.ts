import { Game } from '../core/game.js';
import type { GameConfig, Placement } from '../core/types.js';
import type { Weights } from '../ai/evaluator.js';
import { greedySelect } from '../ai/greedy.js';

export interface CEConfig {
  populationSize: number; // N: number of candidate weight vectors per iteration
  eliteRatio: number; // rho: fraction of top candidates to keep (e.g. 0.1)
  iterations: number; // number of CE iterations
  gamesPerEval: number; // games per candidate for evaluation
  maxPiecesPerGame: number; // cap to prevent infinite games
  noiseInit: number; // initial noise added to variance
  noiseFinal: number; // final noise
  seed: number;
  randomizer: 'uniform' | 'bag7';
  previewCount: number;
  allowHold: boolean;
}

export interface CEIterationResult {
  iteration: number;
  eliteMean: number;
  eliteMedian: number;
  bestScore: number;
  weights: Weights;
  sigma: number[];
}

export interface CEResult {
  bestWeights: Weights;
  history: CEIterationResult[];
}

// Simple seeded PRNG for CE sampling
function createPrng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function gaussianSample(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

function playOneGame(
  weights: Weights,
  gameConfig: Partial<GameConfig>,
  maxPieces: number,
): number {
  const game = new Game(gameConfig);
  while (!game.gameOver && game.piecesPlaced < maxPieces) {
    const snapshot = game.snapshot();
    const placement: Placement | null = greedySelect(snapshot, weights);
    if (!placement) break;
    game.applyPlacement(placement);
  }
  return game.linesCleared;
}

export function trainCrossEntropy(
  config: CEConfig,
  initialWeights?: Weights,
  onIteration?: (result: CEIterationResult) => void,
): CEResult {
  const dim = 8;
  const rng = createPrng(config.seed);

  // Initialize mean and variance
  const mu = initialWeights ? [...initialWeights] : new Array(dim).fill(0);
  const sigma2 = new Array(dim).fill(100); // high initial variance

  const eliteCount = Math.max(1, Math.floor(config.populationSize * config.eliteRatio));
  const history: CEIterationResult[] = [];

  for (let iter = 0; iter < config.iterations; iter++) {
    // Noise schedule: linear decay
    const noiseT =
      config.noiseInit + (config.noiseFinal - config.noiseInit) * (iter / Math.max(1, config.iterations - 1));

    // Sample population
    const population: { weights: number[]; score: number }[] = [];

    for (let i = 0; i < config.populationSize; i++) {
      // Sample weights from N(mu, sigma2 + noise)
      const w: number[] = [];
      for (let d = 0; d < dim; d++) {
        const std = Math.sqrt(Math.max(0, sigma2[d]!) + noiseT);
        w.push(mu[d]! + std * gaussianSample(rng));
      }

      // Evaluate
      let totalLines = 0;
      for (let g = 0; g < config.gamesPerEval; g++) {
        const gameSeed = config.seed + iter * config.populationSize * config.gamesPerEval + i * config.gamesPerEval + g;
        const gameConfig: Partial<GameConfig> = {
          randomizer: config.randomizer,
          previewCount: config.previewCount,
          allowHold: config.allowHold,
          seed: gameSeed,
        };
        totalLines += playOneGame(w as unknown as Weights, gameConfig, config.maxPiecesPerGame);
      }

      population.push({ weights: w, score: totalLines / config.gamesPerEval });
    }

    // Sort by score descending, select elite
    population.sort((a, b) => b.score - a.score);
    const elites = population.slice(0, eliteCount);

    // Update mu and sigma2
    for (let d = 0; d < dim; d++) {
      let mean = 0;
      for (const e of elites) mean += e.weights[d]!;
      mean /= eliteCount;
      mu[d] = mean;

      let variance = 0;
      for (const e of elites) variance += (e.weights[d]! - mean) ** 2;
      variance /= eliteCount;
      sigma2[d] = variance;
    }

    const scores = elites.map((e) => e.score);
    const sortedScores = [...scores].sort((a, b) => a - b);

    const iterResult: CEIterationResult = {
      iteration: iter + 1,
      eliteMean: scores.reduce((a, b) => a + b, 0) / scores.length,
      eliteMedian:
        sortedScores.length % 2 === 0
          ? (sortedScores[sortedScores.length / 2 - 1]! + sortedScores[sortedScores.length / 2]!) / 2
          : sortedScores[Math.floor(sortedScores.length / 2)]!,
      bestScore: population[0]!.score,
      weights: mu.slice() as unknown as Weights,
      sigma: sigma2.map(Math.sqrt),
    };

    history.push(iterResult);
    if (onIteration) onIteration(iterResult);
  }

  return {
    bestWeights: mu.slice() as unknown as Weights,
    history,
  };
}
