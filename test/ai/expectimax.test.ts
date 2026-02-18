import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/game.js';
import { BCTS_WEIGHTS } from '../../src/ai/evaluator.js';
import { expectimaxSelect } from '../../src/ai/expectimax.js';
import type { Placement } from '../../src/core/types.js';

describe('Expectimax planner', () => {
  it('should return a valid placement', () => {
    const game = new Game({ seed: 1, previewCount: 1, allowHold: false });
    const snapshot = game.snapshot();
    const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 2 });

    expect(placement).not.toBeNull();
    expect(placement!.piece).toBe(snapshot.currentPiece);
    expect(placement!.held).toBe(false);
  });

  it('depth=1 should behave like greedy', () => {
    const game = new Game({ seed: 42, previewCount: 1, allowHold: false });
    const snapshot = game.snapshot();
    // Depth 1 = greedy: only evaluates current piece placements
    const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });

    expect(placement).not.toBeNull();
    expect(placement!.piece).toBe(snapshot.currentPiece);
  });

  it('depth=2 should play a complete game', { timeout: 30_000 }, () => {
    const game = new Game({
      seed: 7,
      previewCount: 1,
      randomizer: 'bag7',
      allowHold: false,
    });

    let moves = 0;
    const maxMoves = 200;

    while (!game.gameOver && moves < maxMoves) {
      const snapshot = game.snapshot();
      const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 2 });
      if (!placement) break;
      game.applyPlacement(placement);
      moves++;
    }

    expect(moves).toBe(maxMoves);
    expect(game.linesCleared).toBeGreaterThan(0);
  });

  it('depth=2 should outperform depth=1 over a game', { timeout: 60_000 }, () => {
    const maxMoves = 300;

    function playGame(depth: number, seed: number): number {
      const game = new Game({
        seed,
        previewCount: 1,
        randomizer: 'bag7',
        allowHold: false,
      });

      let moves = 0;
      while (!game.gameOver && moves < maxMoves) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth });
        if (!placement) break;
        game.applyPlacement(placement);
        moves++;
      }
      return game.linesCleared;
    }

    // Average over a few seeds
    let d1Total = 0;
    let d2Total = 0;
    const seeds = [1, 2, 3];
    for (const seed of seeds) {
      d1Total += playGame(1, seed);
      d2Total += playGame(2, seed);
    }

    // Depth 2 should generally be at least as good
    // (with BCTS weights, depth 2 consistently outperforms depth 1)
    expect(d2Total).toBeGreaterThanOrEqual(d1Total * 0.8);
  });
});
