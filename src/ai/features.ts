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

  // Feature 3: Row transitions
  // For each row (up to maxColHeight), count filled↔empty transitions.
  // Walls are NOT counted as filled — this prevents artificial bias toward
  // wall-adjacent placements in adversarial scenarios.
  let rowTransitions = 0;
  for (let y = 0; y < maxColHeight; y++) {
    let prevFilled = board.get(0, y);
    for (let x = 1; x < w; x++) {
      const filled = board.get(x, y);
      if (filled !== prevFilled) rowTransitions++;
      prevFilled = filled;
    }
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

  // Feature 6: Cumulative wells
  // A well at column x exists where both neighbors are higher than x.
  // Wall columns (0 and w-1) only check their inner neighbor — walls are NOT
  // treated as infinitely tall columns, preventing artificial incentive to
  // fill wall-adjacent columns.
  // Well depth = min(leftHeight, rightHeight) - colHeight[x], clamped to >= 0.
  // Cumulative well = 1 + 2 + ... + depth = depth * (depth + 1) / 2
  let cumulativeWells = 0;
  for (let x = 0; x < w; x++) {
    let minNeighbor: number;
    if (x === 0) {
      minNeighbor = colHeight[1]!;
    } else if (x === w - 1) {
      minNeighbor = colHeight[w - 2]!;
    } else {
      minNeighbor = Math.min(colHeight[x - 1]!, colHeight[x + 1]!);
    }
    const depth = minNeighbor - colHeight[x]!;
    if (depth > 0) {
      cumulativeWells += (depth * (depth + 1)) / 2;
    }
  }

  return {
    landingHeight,
    erodedPieceCells,
    rowTransitions,
    colTransitions,
    holes,
    cumulativeWells,
    holeDepth,
    rowsWithHoles,
  };
}
