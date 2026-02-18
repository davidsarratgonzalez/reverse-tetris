import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/game.js';
import { Piece, Rotation } from '../../src/core/types.js';

describe('Game', () => {
  it('should create a game with default config', () => {
    const game = new Game({ seed: 42 });
    expect(game.gameOver).toBe(false);
    expect(game.linesCleared).toBe(0);
    expect(game.piecesPlaced).toBe(0);
  });

  it('should have a valid current piece', () => {
    const game = new Game({ seed: 42 });
    expect(game.currentPiece).toBeGreaterThanOrEqual(0);
    expect(game.currentPiece).toBeLessThan(7);
  });

  it('should move piece left and right', () => {
    const game = new Game({ seed: 42 });
    const startX = game.currentX;
    expect(game.moveLeft()).toBe(true);
    expect(game.currentX).toBe(startX - 1);
    expect(game.moveRight()).toBe(true);
    expect(game.currentX).toBe(startX);
  });

  it('should move piece down', () => {
    const game = new Game({ seed: 42 });
    const startY = game.currentY;
    expect(game.moveDown()).toBe(true);
    expect(game.currentY).toBe(startY - 1);
  });

  it('should rotate piece', () => {
    const game = new Game({ seed: 42 });
    const startRot = game.currentRotation;
    expect(game.rotate(1)).toBe(true);
    expect(game.currentRotation).not.toBe(startRot);
  });

  it('should hard drop and spawn next piece', () => {
    const game = new Game({ seed: 42 });
    const result = game.hardDrop();
    expect(result.gameOver).toBe(false);
    expect(game.piecesPlaced).toBe(1);
  });

  it('should support hold', () => {
    const game = new Game({ seed: 42, allowHold: true });
    const firstPiece = game.currentPiece;
    expect(game.hold()).toBe(true);
    expect(game.holdPiece).toBe(firstPiece);
    expect(game.holdUsed).toBe(true);
    // Should not be able to hold again before locking
    expect(game.hold()).toBe(false);
  });

  it('should apply placement directly', () => {
    const game = new Game({ seed: 42 });
    const piece = game.currentPiece;
    const result = game.applyPlacement({
      piece,
      rotation: Rotation.R0,
      x: 3,
      y: 0,
      held: false,
    });
    expect(result.gameOver).toBe(false);
    expect(game.piecesPlaced).toBe(1);
  });

  it('should return preview pieces', () => {
    const game = new Game({ seed: 42, previewCount: 5 });
    const preview = game.getPreview();
    expect(preview.length).toBe(5);
    for (const p of preview) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(7);
    }
  });

  it('should detect game over when board fills up', () => {
    const game = new Game({ seed: 42 });
    // Play until game over
    let moves = 0;
    while (!game.gameOver && moves < 100) {
      // Always drop at current position
      game.hardDrop();
      moves++;
    }
    // Should eventually game over with random drops
    expect(game.gameOver).toBe(true);
  });

  it('should simulate placement correctly', () => {
    const game = new Game({ seed: 42 });
    const sim = Game.simulatePlacement(game.board, Piece.I, Rotation.R0, 3, 0);
    expect(sim).not.toBeNull();
    expect(sim!.landingCells.length).toBe(4);
    // Original board should be unchanged
    expect(game.board.get(3, 2)).toBe(false);
  });
});
