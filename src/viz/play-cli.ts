import { Game } from '../core/game.js';
import type { GameConfig, Placement } from '../core/types.js';
import { beamSearchSelect, type BeamSearchConfig } from '../ai/beam.js';
import { greedySelect } from '../ai/greedy.js';
import type { Weights } from '../ai/evaluator.js';
import { BCTS_WEIGHTS, loadWeights } from '../ai/weights.js';
import { TerminalRenderer, type RenderStats } from './terminal.js';

function parseArgs(): {
  planner: 'greedy' | 'beam';
  beamWidth: number;
  beamDepth: number;
  randomizer: 'uniform' | 'bag7';
  previewCount: number;
  allowHold: boolean;
  delay: number;
  seed: number;
  weightsPath?: string;
  maxPieces: number;
} {
  const args = process.argv.slice(2);
  const opts = {
    planner: 'beam' as 'greedy' | 'beam',
    beamWidth: 50,
    beamDepth: 3,
    randomizer: 'bag7' as 'uniform' | 'bag7',
    previewCount: 5,
    allowHold: true,
    delay: 50,
    seed: Date.now(),
    weightsPath: undefined as string | undefined,
    maxPieces: Infinity,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--planner':
        opts.planner = next as 'greedy' | 'beam';
        i++;
        break;
      case '--beam-width':
        opts.beamWidth = parseInt(next!, 10);
        i++;
        break;
      case '--beam-depth':
        opts.beamDepth = parseInt(next!, 10);
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
      case '--delay':
        opts.delay = parseInt(next!, 10);
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
      case '--max-pieces':
        opts.maxPieces = parseInt(next!, 10);
        i++;
        break;
    }
  }
  return opts;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const opts = parseArgs();
  let weights: Weights = BCTS_WEIGHTS;
  if (opts.weightsPath) {
    weights = await loadWeights(opts.weightsPath);
  }

  const gameConfig: Partial<GameConfig> = {
    randomizer: opts.randomizer,
    previewCount: opts.previewCount,
    allowHold: opts.allowHold,
    seed: opts.seed,
  };

  const game = new Game(gameConfig);
  const renderer = new TerminalRenderer();
  const beamConfig: BeamSearchConfig = { beamWidth: opts.beamWidth, depth: opts.beamDepth };

  const startTime = performance.now();
  let totalDecisionMs = 0;
  let decisions = 0;

  console.log(`Planner: ${opts.planner}${opts.planner === 'beam' ? ` (w=${opts.beamWidth}, d=${opts.beamDepth})` : ''}`);
  console.log(`Randomizer: ${opts.randomizer} | Hold: ${opts.allowHold} | Preview: ${opts.previewCount}`);
  console.log(`Seed: ${opts.seed}\n`);

  while (!game.gameOver && game.piecesPlaced < opts.maxPieces) {
    const snapshot = game.snapshot();
    const decisionStart = performance.now();

    let placement: Placement | null;
    if (opts.planner === 'beam') {
      placement = beamSearchSelect(snapshot, weights, beamConfig);
    } else {
      placement = greedySelect(snapshot, weights);
    }

    const decisionMs = performance.now() - decisionStart;
    totalDecisionMs += decisionMs;
    decisions++;

    if (!placement) {
      // No valid placement found — game will end
      break;
    }

    game.applyPlacement(placement);

    const elapsed = performance.now() - startTime;
    const stats: RenderStats = {
      linesCleared: game.linesCleared,
      piecesPlaced: game.piecesPlaced,
      elapsedMs: elapsed,
      msPerDecision: totalDecisionMs / decisions,
    };
    renderer.render(game.snapshot(), stats);

    if (opts.delay > 0) {
      await sleep(opts.delay);
    }
  }

  renderer.clear();
  console.log('\n=== GAME OVER ===');
  console.log(`Lines cleared: ${game.linesCleared.toLocaleString()}`);
  console.log(`Pieces placed: ${game.piecesPlaced.toLocaleString()}`);
  console.log(`Avg decision: ${(totalDecisionMs / decisions).toFixed(2)}ms`);
  console.log(`Total time: ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(console.error);
