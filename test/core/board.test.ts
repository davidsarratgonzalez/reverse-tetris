import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { Piece, Rotation } from '../../src/core/types.js';

describe('Board', () => {
  it('should create an empty board', () => {
    const board = new Board(10, 24);
    expect(board.width).toBe(10);
    expect(board.totalHeight).toBe(24);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 24; y++) {
        expect(board.get(x, y)).toBe(false);
      }
    }
  });

  it('should set and get cells', () => {
    const board = new Board(10, 24);
    board.set(3, 5, true);
    expect(board.get(3, 5)).toBe(true);
    expect(board.get(3, 4)).toBe(false);
    board.set(3, 5, false);
    expect(board.get(3, 5)).toBe(false);
  });

  it('should track column heights', () => {
    const board = new Board(10, 24);
    expect(board.getColumnHeight(0)).toBe(0);
    board.set(0, 0, true);
    expect(board.getColumnHeight(0)).toBe(1);
    board.set(0, 5, true);
    expect(board.getColumnHeight(0)).toBe(6);
    board.set(0, 5, false);
    expect(board.getColumnHeight(0)).toBe(1);
  });

  it('should detect full rows', () => {
    const board = new Board(10, 24);
    for (let x = 0; x < 10; x++) {
      board.set(x, 0, true);
    }
    expect(board.isRowFull(0)).toBe(true);
    expect(board.isRowFull(1)).toBe(false);
  });

  it('should clear lines and shift rows down', () => {
    const board = new Board(10, 24);
    // Fill row 0 completely
    for (let x = 0; x < 10; x++) {
      board.set(x, 0, true);
    }
    // Put a block at row 1
    board.set(3, 1, true);

    const result = board.clearLines();
    expect(result.count).toBe(1);
    expect(result.rows).toEqual([0]);

    // Row 1 should have shifted to row 0
    expect(board.get(3, 0)).toBe(true);
    // Row 1 should be empty now
    expect(board.get(3, 1)).toBe(false);
  });

  it('should clear multiple lines', () => {
    const board = new Board(10, 24);
    // Fill rows 0 and 1
    for (let x = 0; x < 10; x++) {
      board.set(x, 0, true);
      board.set(x, 1, true);
    }
    // Put a block at row 2
    board.set(5, 2, true);

    const result = board.clearLines();
    expect(result.count).toBe(2);
    // Block from row 2 should now be at row 0
    expect(board.get(5, 0)).toBe(true);
    expect(board.get(5, 1)).toBe(false);
  });

  it('should detect collisions', () => {
    const board = new Board(10, 24);
    // No collision on empty board for T piece at spawn
    expect(board.collides(Piece.T, Rotation.R0, 3, 18)).toBe(false);

    // Place some blocks where T would go
    board.set(4, 19, true); // center top cell of T at (3, 18)
    expect(board.collides(Piece.T, Rotation.R0, 3, 18)).toBe(true);
  });

  it('should detect out-of-bounds collisions', () => {
    const board = new Board(10, 24);
    // I piece horizontal at x=-1 should collide (cell at x=-1)
    expect(board.collides(Piece.I, Rotation.R0, -1, 0)).toBe(true);
    // I piece horizontal at x=7 should not collide (cells at 7,8,9,10 - but 10 is out of bounds)
    expect(board.collides(Piece.I, Rotation.R0, 7, 0)).toBe(true);
    // I piece horizontal at x=6 should not collide (cells at 6,7,8,9)
    expect(board.collides(Piece.I, Rotation.R0, 6, 0)).toBe(false);
  });

  it('should clone correctly', () => {
    const board = new Board(10, 24);
    board.set(5, 5, true);
    const clone = board.clone();
    expect(clone.get(5, 5)).toBe(true);
    clone.set(5, 5, false);
    expect(board.get(5, 5)).toBe(true); // original unchanged
  });

  it('should place pieces', () => {
    const board = new Board(10, 24);
    const placed = board.placePiece(Piece.O, Rotation.R0, 4, 0);
    expect(placed.length).toBe(4);
    expect(board.get(5, 1)).toBe(true);
    expect(board.get(6, 1)).toBe(true);
    expect(board.get(5, 2)).toBe(true);
    expect(board.get(6, 2)).toBe(true);
  });

  it('should update column heights after clearing lines', () => {
    const board = new Board(10, 24);
    for (let x = 0; x < 10; x++) {
      board.set(x, 0, true);
    }
    board.set(2, 1, true);
    board.set(2, 2, true);
    board.clearLines();
    // After clearing row 0, row 1 becomes row 0, row 2 becomes row 1
    expect(board.getColumnHeight(2)).toBe(2);
    expect(board.getColumnHeight(0)).toBe(0);
  });
});
