import { Board } from '../core/board.js';
import type { FeatureVector } from '../core/types.js';

/**
 * Extract the 8 BCTS features from a board state after piece placement.
 *
 * Features 1-2 (landingHeight, erodedPieceCells) require placement metadata.
 * Features 3-8 are computed from the board state after lock + line clear.
 *
 * @param board - Board state AFTER piece is locked and lines cleared
 * @param landingCellYs - Y coordinates of the piece cells BEFORE line clear
 * @param linesCleared - Number of lines cleared by this placement
 * @param pieceCellsInCleared - Number of piece cells that were in cleared lines
 */
export function extractFeatures(
  board: Board,
  landingCellYs: number[],
  linesCleared: number,
  pieceCellsInCleared: number,
): FeatureVector {
  const w = board.width;
  const h = board.totalHeight;

  // Feature 1: Landing height = average of min and max Y of piece cells (before clear)
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cy of landingCellYs) {
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }
  const landingHeight = (minY + maxY) / 2;

  // Feature 2: Eroded piece cells
  const erodedPieceCells = linesCleared * pieceCellsInCleared;

  // Precompute column heights for features 3-8
  const colHeight = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    colHeight[x] = board.getColumnHeight(x);
  }
  const maxColHeight = Math.max(...colHeight);

  // Feature 3: Row transitions (standard BCTS — walls = FULL)
  // For each row (up to maxColHeight), count filled↔empty transitions.
  // Both left and right walls count as filled cells (standard BCTS definition).
  let rowTransitions = 0;
  for (let y = 0; y < maxColHeight; y++) {
    let prevFilled = true; // left wall = FULL
    for (let x = 0; x < w; x++) {
      const filled = board.get(x, y);
      if (filled !== prevFilled) rowTransitions++;
      prevFilled = filled;
    }
    if (!prevFilled) rowTransitions++; // right wall = FULL
  }

  // Feature 4: Column transitions
  // For each column, count filled↔empty transitions.
  // Floor (below row 0) counts as filled. Above highest occupied row counts as empty.
  let colTransitions = 0;
  for (let x = 0; x < w; x++) {
    let prevFilled = true; // floor is filled
    const ch = colHeight[x]!;
    for (let y = 0; y < ch; y++) {
      const filled = board.get(x, y);
      if (filled !== prevFilled) colTransitions++;
      prevFilled = filled;
    }
    // Top of column to empty space above: if last cell was filled, that's a transition
    if (prevFilled && ch > 0) colTransitions++;
  }

  // Feature 5: Holes (empty cells with at least one filled cell above in same column)
  // Feature 7: Hole depth (for each hole, count filled cells above it)
  // Feature 8: Rows with holes
  let holes = 0;
  let holeDepth = 0;
  const rowHasHole = new Uint8Array(h);

  for (let x = 0; x < w; x++) {
    const ch = colHeight[x]!;
    let filledAbove = 0;
    for (let y = ch - 1; y >= 0; y--) {
      if (board.get(x, y)) {
        filledAbove++;
      } else {
        // This is a hole
        holes++;
        holeDepth += filledAbove;
        rowHasHole[y] = 1;
      }
    }
  }

  let rowsWithHoles = 0;
  for (let y = 0; y < h; y++) {
    if (rowHasHole[y]) rowsWithHoles++;
  }

  // Feature 6: Cumulative wells (standard BCTS — walls = infinitely tall)
  // A well at column x exists where both neighbors are higher than x.
  // Wall boundaries are treated as infinitely tall (height h), standard BCTS.
  // Well depth = min(leftHeight, rightHeight) - colHeight[x], clamped to >= 0.
  // Cumulative well = 1 + 2 + ... + depth = depth * (depth + 1) / 2
  let cumulativeWells = 0;
  for (let x = 0; x < w; x++) {
    const left = x === 0 ? h : colHeight[x - 1]!;
    const right = x === w - 1 ? h : colHeight[x + 1]!;
    const minNeighbor = Math.min(left, right);
    const depth = minNeighbor - colHeight[x]!;
    if (depth > 0) {
      cumulativeWells += (depth * (depth + 1)) / 2;
    }
  }

  // Feature 9: Peak sum — symmetric to cumulativeWells, penalizes peaks/towers.
  // For each column, measure how much it protrudes above its neighbors.
  // Walls are treated as height=0 (open), opposite of wells where walls=∞.
  // Cumulative formula matches wells: 1+2+...+peak = peak*(peak+1)/2
  let peakSum = 0;
  for (let x = 0; x < w; x++) {
    const left = x === 0 ? 0 : colHeight[x - 1]!;
    const right = x === w - 1 ? 0 : colHeight[x + 1]!;
    const peak = colHeight[x]! - Math.max(left, right);
    if (peak > 0) {
      peakSum += (peak * (peak + 1)) / 2;
    }
  }

  // Feature 10: Cliffiness squared — Σ(Δh)² between adjacent columns.
  // Penalizes large height differences quadratically (towers punished harder).
  let cliffinessSquared = 0;
  for (let x = 0; x < w - 1; x++) {
    const diff = colHeight[x]! - colHeight[x + 1]!;
    cliffinessSquared += diff * diff;
  }

  // Feature 11: Max column height — the tallest column on the board.
  const maxHeight = maxColHeight;

  return {
    landingHeight,
    erodedPieceCells,
    rowTransitions,
    colTransitions,
    holes,
    cumulativeWells,
    holeDepth,
    rowsWithHoles,
    peakSum,
    cliffinessSquared,
    maxHeight,
  };
}
