import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { tryRotate } from '../../src/core/srs.js';
import { Piece, Rotation } from '../../src/core/types.js';

describe('SRS rotation', () => {
  it('should rotate T piece CW on empty board', () => {
    const board = new Board(10, 24);
    // T at (3, 5): cells at (4,7), (3,6), (4,6), (5,6)
    const result = tryRotate(board, Piece.T, Rotation.R0, 1, 3, 5);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(Rotation.R1);
    // First kick for JLSTZ 0>1 is (0,0), so position should stay
    expect(result!.x).toBe(3);
    expect(result!.y).toBe(5);
  });

  it('should rotate T piece CCW on empty board', () => {
    const board = new Board(10, 24);
    const result = tryRotate(board, Piece.T, Rotation.R0, -1, 3, 5);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(Rotation.R3);
    expect(result!.x).toBe(3);
    expect(result!.y).toBe(5);
  });

  it('should use wall kick when rotation at wall', () => {
    const board = new Board(10, 24);
    // Place I piece horizontal at x=0, try to rotate CW
    // I R0 cells: (0,2),(1,2),(2,2),(3,2) relative to origin
    // At x=0, y=0: cells at board (0,2),(1,2),(2,2),(3,2)
    // R1 cells: (2,0),(2,1),(2,2),(2,3) relative to origin
    // First kick for I 0>1 is (1,0), so new origin = (1, 0)
    // R1 cells at (1,0): (3,0),(3,1),(3,2),(3,3)
    const result = tryRotate(board, Piece.I, Rotation.R0, 1, 0, 0);
    expect(result).not.toBeNull();
    // Should find a valid position via kicks
    expect(result!.rotation).toBe(Rotation.R1);
  });

  it('should return null when no kick works', () => {
    const board = new Board(10, 24);
    // Fill the board almost completely to block rotation
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 10; x++) {
        board.set(x, y, true);
      }
    }
    // Clear a small space for the T piece
    board.set(4, 3, false);
    board.set(5, 3, false);
    board.set(5, 2, false);

    // Try to rotate a piece in a very constrained space
    // This might still find a valid kick, so let's make it truly impossible
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 10; x++) {
        board.set(x, y, true);
      }
    }
    // Only one cell free
    board.set(5, 5, false);
    const result = tryRotate(board, Piece.T, Rotation.R0, 1, 4, 4);
    expect(result).toBeNull();
  });

  it('should handle O piece rotation (always succeeds on empty board)', () => {
    const board = new Board(10, 24);
    const result = tryRotate(board, Piece.O, Rotation.R0, 1, 4, 4);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(Rotation.R1);
    // O piece doesn't move on rotation (cells are same)
    expect(result!.x).toBe(4);
    expect(result!.y).toBe(4);
  });

  it('should rotate through all 4 states', () => {
    const board = new Board(10, 24);
    let x = 4, y = 10, rot: Rotation = Rotation.R0;

    for (let i = 0; i < 4; i++) {
      const result = tryRotate(board, Piece.T, rot, 1, x, y);
      expect(result).not.toBeNull();
      x = result!.x;
      y = result!.y;
      rot = result!.rotation;
    }
    // After 4 CW rotations, should be back to R0
    expect(rot).toBe(Rotation.R0);
  });
});
