import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/game.js';
import { greedySelect } from '../../src/ai/greedy.js';
import { BCTS_WEIGHTS } from '../../src/ai/weights.js';

describe('Greedy planner', () => {
  it('should return a valid placement', () => {
    const game = new Game({ seed: 42, allowHold: false });
    const snapshot = game.snapshot();
    const placement = greedySelect(snapshot, BCTS_WEIGHTS);
    expect(placement).not.toBeNull();
    expect(placement!.piece).toBe(snapshot.currentPiece);
    expect(placement!.held).toBe(false);
  });

  it('should play a complete game without crashing', () => {
    const game = new Game({ seed: 42, previewCount: 0, allowHold: false });
    let moves = 0;
    while (!game.gameOver && moves < 10000) {
      const snapshot = game.snapshot();
      const placement = greedySelect(snapshot, BCTS_WEIGHTS);
      if (!placement) break;
      game.applyPlacement(placement);
      moves++;
    }
    expect(moves).toBeGreaterThan(10);
    expect(game.linesCleared).toBeGreaterThanOrEqual(0);
  });

  it('should clear lines with BCTS weights', () => {
    const game = new Game({ seed: 42, previewCount: 0, allowHold: false });
    let moves = 0;
    while (!game.gameOver && moves < 5000) {
      const snapshot = game.snapshot();
      const placement = greedySelect(snapshot, BCTS_WEIGHTS);
      if (!placement) break;
      game.applyPlacement(placement);
      moves++;
    }
    // With BCTS weights, should clear some lines
    expect(game.linesCleared).toBeGreaterThan(0);
  });

  it('should consider hold placements when enabled', () => {
    const game = new Game({ seed: 42, previewCount: 5, allowHold: true });
    const snapshot = game.snapshot();
    const placement = greedySelect(snapshot, BCTS_WEIGHTS);
    expect(placement).not.toBeNull();
    // Placement may or may not use hold, but it should be a valid choice
  });

  it('should be deterministic with same input', () => {
    const game = new Game({ seed: 42 });
    const snap1 = game.snapshot();
    const p1 = greedySelect(snap1, BCTS_WEIGHTS);

    const game2 = new Game({ seed: 42 });
    const snap2 = game2.snapshot();
    const p2 = greedySelect(snap2, BCTS_WEIGHTS);

    expect(p1).toEqual(p2);
  });
});
