import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { beamSearchSelect } from '../../src/ai/beam.js';
import { BCTS_WEIGHTS } from '../../src/ai/evaluator.js';
import { Game } from '../../src/core/game.js';
import { Piece, Rotation } from '../../src/core/types.js';
import type { GameSnapshot } from '../../src/core/types.js';

function makeSnapshot(overrides?: Partial<GameSnapshot>): GameSnapshot {
  const board = new Board(10, 40);
  return {
    board,
    height: 20,
    rotationSystem: 'srs',
    currentPiece: Piece.T,
    holdPiece: null,
    holdUsed: false,
    allowHold: true,
    preview: [Piece.I, Piece.S, Piece.Z, Piece.J, Piece.L],
    linesCleared: 0,
    piecesPlaced: 0,
    ...overrides,
  };
}

describe('Beam search AI', () => {
  it('should return a valid placement on empty board', () => {
    const snapshot = makeSnapshot();
    const result = beamSearchSelect(snapshot, BCTS_WEIGHTS, { depth: 3, beamWidth: 50 });
    expect(result).not.toBeNull();
    expect(result!.piece).toBe(Piece.T);
    expect(typeof result!.x).toBe('number');
    expect(typeof result!.y).toBe('number');
  });

  it('should handle hold piece', () => {
    const snapshot = makeSnapshot({
      currentPiece: Piece.S,
      holdPiece: Piece.I,
      holdUsed: false,
      allowHold: true,
    });
    const result = beamSearchSelect(snapshot, BCTS_WEIGHTS, { depth: 2, beamWidth: 50 });
    expect(result).not.toBeNull();
    // Result should be either S (no hold) or I (held)
    expect(result!.piece === Piece.S || result!.piece === Piece.I).toBe(true);
  });

  it('should handle depth exceeding preview length gracefully', () => {
    const snapshot = makeSnapshot({
      preview: [Piece.I], // only 1 preview
    });
    // depth=5 but only 1 preview — should not crash
    const result = beamSearchSelect(snapshot, BCTS_WEIGHTS, { depth: 5, beamWidth: 50 });
    expect(result).not.toBeNull();
  });

  it('should return null when no placements available', () => {
    // Fill board almost entirely to block all placements
    const board = new Board(10, 40);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 10; x++) {
        board.set(x, y, true);
      }
    }
    const snapshot = makeSnapshot({ board, allowHold: false });
    const result = beamSearchSelect(snapshot, BCTS_WEIGHTS);
    expect(result).toBeNull();
  });

  it('should play a complete game without crashing', { timeout: 30000 }, () => {
    const game = new Game({
      width: 10,
      height: 20,
      bufferRows: 20,
      previewCount: 5,
      allowHold: true,
      seed: 42,
      rotationSystem: 'srs',
    });

    let moves = 0;
    while (!game.gameOver && moves < 50) {
      const snapshot = game.snapshot();
      const placement = beamSearchSelect(snapshot, BCTS_WEIGHTS, { depth: 2, beamWidth: 30 });
      if (!placement) break;
      game.applyPlacement(placement);
      moves++;
    }

    expect(moves).toBeGreaterThan(10);
    expect(game.linesCleared).toBeGreaterThan(0);
  });

  it('should work without hold (classic-like config)', () => {
    const snapshot = makeSnapshot({
      allowHold: false,
      holdPiece: null,
      preview: [Piece.Z],
    });
    const result = beamSearchSelect(snapshot, BCTS_WEIGHTS, { depth: 2, beamWidth: 50 });
    expect(result).not.toBeNull();
    expect(result!.held).toBe(false);
  });
});
