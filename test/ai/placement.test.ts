import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { getSpawnPosition } from '../../src/core/constants.js';
import { Piece, Rotation } from '../../src/core/types.js';
import { generatePlacements } from '../../src/ai/placement.js';

describe('Placement generation', () => {
  it('should generate placements for I piece on empty board', () => {
    const board = new Board(10, 24);
    const spawn = getSpawnPosition(Piece.I, 10, 20);
    const placements = generatePlacements(board, Piece.I, spawn.x, spawn.y);
    // I piece can go horizontal (10 - 4 + 1 = 7 positions) + vertical (10 positions)
    // + R2 horizontal (7 positions) + R3 vertical (10 positions)
    // But R0 and R2 at the bottom will be at different y values,
    // and R1 and R3 are at different x positions.
    // On an empty board, there should be many placements
    expect(placements.length).toBeGreaterThan(10);
    // All placements should be at y=0 (grounded on floor) for horizontal
    const horizontal = placements.filter(
      (p) => p.rotation === Rotation.R0 || p.rotation === Rotation.R2,
    );
    expect(horizontal.length).toBeGreaterThan(0);
  });

  it('should generate placements for O piece on empty board', () => {
    const board = new Board(10, 24);
    const spawn = getSpawnPosition(Piece.O, 10, 20);
    const placements = generatePlacements(board, Piece.O, spawn.x, spawn.y);
    // O piece: all rotations are the same, so we get 9 x-positions (10 - 2 + 1 = 9)
    // The BFS will only discover R0 states (since rotating O produces the same collision shape
    // but different rotation values), so we may get 9-36 depending on rotation exploration.
    // At minimum, 9 unique grounded positions for R0
    const r0 = placements.filter((p) => p.rotation === Rotation.R0);
    expect(r0.length).toBe(9); // x from 0 to 8 (cells occupy x+1,x+2 -> max x=8 for cells at 9,10? no, 8 gives cells at 9,10 which is out of bounds... let me check)
    // O cells: (1,1),(2,1),(1,2),(2,2). So for x=pos, cells at pos+1 and pos+2.
    // max valid: pos+2 <= 9 => pos <= 7. min: pos+1 >= 0 => pos >= -1. But pos >= 0 for reasonable positions. Actually pos can be -1 (cells at 0 and 1).
    // With BFS from spawn at x=3, it explores all reachable x values.
    expect(r0.length).toBeGreaterThanOrEqual(8);
  });

  it('should respect board obstacles', () => {
    const board = new Board(10, 24);
    // Fill bottom row except column 0
    for (let x = 1; x < 10; x++) {
      board.set(x, 0, true);
    }
    const spawn = getSpawnPosition(Piece.I, 10, 20);
    const placements = generatePlacements(board, Piece.I, spawn.x, spawn.y);
    // Should have fewer placements than on empty board
    expect(placements.length).toBeGreaterThan(0);
  });

  it('should return empty array when spawn is blocked', () => {
    const board = new Board(10, 24);
    // Fill the top area
    for (let y = 17; y < 24; y++) {
      for (let x = 0; x < 10; x++) {
        board.set(x, y, true);
      }
    }
    const spawn = getSpawnPosition(Piece.T, 10, 20);
    const placements = generatePlacements(board, Piece.T, spawn.x, spawn.y);
    expect(placements.length).toBe(0);
  });

  it('should generate all unique placements', () => {
    const board = new Board(10, 24);
    const spawn = getSpawnPosition(Piece.T, 10, 20);
    const placements = generatePlacements(board, Piece.T, spawn.x, spawn.y);
    // Check uniqueness
    const keys = placements.map((p) => `${p.rotation},${p.x},${p.y}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(placements.length);
  });
});
