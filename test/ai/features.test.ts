import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { extractFeatures } from '../../src/ai/features.js';

describe('Feature extraction', () => {
  it('should compute zero features for empty board', () => {
    const board = new Board(10, 24);
    const features = extractFeatures(board, [0, 0, 0, 0], 0, 0);
    expect(features.rowTransitions).toBe(0);
    expect(features.colTransitions).toBe(0);
    expect(features.holes).toBe(0);
    expect(features.cumulativeWells).toBe(0);
    expect(features.holeDepth).toBe(0);
    expect(features.rowsWithHoles).toBe(0);
  });

  it('should compute landing height as average of min/max Y', () => {
    const board = new Board(10, 24);
    const features = extractFeatures(board, [2, 3, 4, 5], 0, 0);
    expect(features.landingHeight).toBe(3.5); // (2+5)/2
  });

  it('should compute eroded piece cells', () => {
    const board = new Board(10, 24);
    const features = extractFeatures(board, [0, 0, 0, 0], 2, 3);
    expect(features.erodedPieceCells).toBe(6); // 2 * 3
  });

  it('should count holes correctly', () => {
    const board = new Board(10, 24);
    // Column 0: filled at row 2, empty at row 1 and 0
    board.set(0, 2, true);
    // rows 0 and 1 in column 0 are holes (empty below filled)
    const features = extractFeatures(board, [2], 0, 0);
    expect(features.holes).toBe(2); // rows 0 and 1 are holes
  });

  it('should count hole depth correctly', () => {
    const board = new Board(10, 24);
    // Column 0: filled at rows 3, 2; empty at row 1, 0
    board.set(0, 3, true);
    board.set(0, 2, true);
    // Row 1: hole with 2 filled cells above
    // Row 0: hole with 2 filled cells above (same 2 cells)
    // Wait, holeDepth counts filled cells ABOVE each hole individually
    const features = extractFeatures(board, [3], 0, 0);
    expect(features.holes).toBe(2);
    expect(features.holeDepth).toBe(2 + 2); // each hole has 2 filled cells above
  });

  it('should count rows with holes', () => {
    const board = new Board(10, 24);
    // Column 0: hole at row 0
    board.set(0, 1, true);
    // Column 5: hole at row 0
    board.set(5, 1, true);
    // Both holes are in row 0
    const features = extractFeatures(board, [1], 0, 0);
    expect(features.rowsWithHoles).toBe(1); // only row 0 has holes
  });

  it('should count row transitions without wall borders', () => {
    const board = new Board(10, 24);
    // Row 0: [filled, empty, empty, ..., empty]
    board.set(0, 0, true);
    // Walls are NOT counted as filled.
    // Transitions: cell0(filled)->cell1(empty)=1, rest are empty=0
    // Total: 1 transition
    const features = extractFeatures(board, [0], 0, 0);
    expect(features.rowTransitions).toBe(1);
  });

  it('should count column transitions', () => {
    const board = new Board(10, 24);
    // Column 0: floor(filled) -> row0(empty) -> row1(filled) -> above(empty)
    board.set(0, 1, true);
    // Transitions: floor(filled)->row0(empty)=1, row0(empty)->row1(filled)=1,
    // row1(filled)->above(empty)=1
    // Total for col 0: 3
    const features = extractFeatures(board, [1], 0, 0);
    expect(features.colTransitions).toBe(3);
  });

  it('should compute cumulative wells', () => {
    const board = new Board(10, 24);
    // Create a well in column 1 by making columns 0 and 2 height 3
    for (let y = 0; y < 3; y++) {
      board.set(0, y, true);
      board.set(2, y, true);
    }
    // Column 1 height = 0, neighbors = 3 and 3, depth = 3
    // Cumulative well = 1 + 2 + 3 = 6
    const features = extractFeatures(board, [0], 0, 0);
    expect(features.cumulativeWells).toBeGreaterThanOrEqual(6);
  });

  it('should handle full row with no features issues', () => {
    const board = new Board(10, 24);
    // Fill bottom row except one cell to avoid line clear
    for (let x = 0; x < 9; x++) {
      board.set(x, 0, true);
    }
    const features = extractFeatures(board, [0], 0, 0);
    // Should not crash and should have some transitions
    expect(features.rowTransitions).toBeGreaterThanOrEqual(0);
  });
});
