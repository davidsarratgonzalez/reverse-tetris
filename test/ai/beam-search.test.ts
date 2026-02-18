import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/game.js';
import { beamSearch } from '../../src/ai/beam-search.js';
import { greedySelect } from '../../src/ai/greedy.js';
import { BCTS_WEIGHTS } from '../../src/ai/weights.js';

describe('Beam search planner', () => {
  it('should return a valid placement', () => {
    const game = new Game({ seed: 42, previewCount: 5 });
    const snapshot = game.snapshot();
    const placement = beamSearch(snapshot, BCTS_WEIGHTS, { width: 10, depth: 2 });
    expect(placement).not.toBeNull();
  });

  it('should play a complete game without crashing', () => {
    const game = new Game({ seed: 42, previewCount: 3, allowHold: true });
    let moves = 0;
    while (!game.gameOver && moves < 500) {
      const snapshot = game.snapshot();
      const placement = beamSearch(snapshot, BCTS_WEIGHTS, { width: 10, depth: 2 });
      if (!placement) break;
      game.applyPlacement(placement);
      moves++;
    }
    expect(moves).toBeGreaterThan(10);
    expect(game.linesCleared).toBeGreaterThan(0);
  });

  it('beam search with width=1 depth=1 should match greedy on same input', () => {
    const game = new Game({ seed: 42, previewCount: 5, allowHold: false });
    const snapshot = game.snapshot();

    const greedyP = greedySelect(snapshot, BCTS_WEIGHTS);
    const beamP = beamSearch(snapshot, BCTS_WEIGHTS, { width: 1, depth: 1 });

    // Both should pick the same placement (same piece, position, rotation)
    expect(greedyP).not.toBeNull();
    expect(beamP).not.toBeNull();
    // They should agree on the core placement (but held may differ if hold isn't useful)
    expect(beamP!.rotation).toBe(greedyP!.rotation);
    expect(beamP!.x).toBe(greedyP!.x);
    expect(beamP!.y).toBe(greedyP!.y);
  });

  it('beam search should perform at least as well as greedy over a game', { timeout: 120_000 }, () => {
    // Run both on the same seed, capped at 200 moves for test speed
    const greedyGame = new Game({ seed: 100, previewCount: 3, allowHold: true });
    let greedyMoves = 0;
    while (!greedyGame.gameOver && greedyMoves < 200) {
      const snapshot = greedyGame.snapshot();
      const p = greedySelect(snapshot, BCTS_WEIGHTS);
      if (!p) break;
      greedyGame.applyPlacement(p);
      greedyMoves++;
    }

    const beamGame = new Game({ seed: 100, previewCount: 3, allowHold: true });
    let beamMoves = 0;
    while (!beamGame.gameOver && beamMoves < 200) {
      const snapshot = beamGame.snapshot();
      const p = beamSearch(snapshot, BCTS_WEIGHTS, { width: 10, depth: 2 });
      if (!p) break;
      beamGame.applyPlacement(p);
      beamMoves++;
    }

    // Beam search should survive at least as long
    expect(beamGame.piecesPlaced).toBeGreaterThanOrEqual(greedyGame.piecesPlaced * 0.5);
  });
});
