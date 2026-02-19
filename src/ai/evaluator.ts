import type { FeatureVector } from '../core/types.js';

export type Weights = readonly [number, number, number, number, number, number, number, number, number, number];

// BCTS default weights (Thiery & Scherrer, 2009) — tuned for SRS
// Order: landingHeight, erodedPieceCells, rowTransitions, colTransitions,
//        holes, cumulativeWells, holeDepth, rowsWithHoles, bumpiness, maxHeight
export const BCTS_WEIGHTS: Weights = [
  -12.63, //  landingHeight
  6.60, //  erodedPieceCells
  -9.22, //  rowTransitions
  -19.77, //  colTransitions
  -13.08, //  holes
  -10.49, //  cumulativeWells
  -1.61, //  holeDepth
  -24.04, //  rowsWithHoles
  0.0, //  bumpiness         (not in original BCTS — SRS handles unevenness via kicks)
  0.0, //  maxHeight          (not in original BCTS)
];

// NRS-adjusted weights: without wall kicks, holes and wells are far more
// dangerous (you can't tuck pieces in to fix them). Play flat and conservative.
// The key additions are bumpiness and maxHeight — BCTS has no tower penalty
// (cumulativeWells only penalizes low columns, not high ones), so NRS bots
// build towers and die when they can't navigate pieces past them.
export const NRS_WEIGHTS: Weights = [
  -18.0, //  landingHeight    (1.4x — keep it flat, towers are death traps)
  6.60, //  erodedPieceCells  (same — still reward clearing)
  -9.22, //  rowTransitions    (same)
  -19.77, //  colTransitions    (same)
  -26.0, //  holes             (2x — holes are nearly unfixable without kicks)
  -20.0, //  cumulativeWells   (2x — deep wells are unfillable with 2-state S/Z/I)
  -8.0, //  holeDepth         (5x — buried holes are permanent in NRS)
  -36.0, //  rowsWithHoles     (1.5x — rows with holes stay stuck)
  -5.0, //  bumpiness         (penalize uneven surfaces — towers block piece movement)
  -3.0, //  maxHeight          (penalize tall columns — they partition the board in NRS)
];

export function evaluate(features: FeatureVector, weights: Weights): number {
  return (
    weights[0] * features.landingHeight +
    weights[1] * features.erodedPieceCells +
    weights[2] * features.rowTransitions +
    weights[3] * features.colTransitions +
    weights[4] * features.holes +
    weights[5] * features.cumulativeWells +
    weights[6] * features.holeDepth +
    weights[7] * features.rowsWithHoles +
    weights[8] * features.bumpiness +
    weights[9] * features.maxHeight
  );
}
