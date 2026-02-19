import type { FeatureVector } from '../core/types.js';

export type Weights = readonly [number, number, number, number, number, number, number, number, number, number, number];

// BCTS default weights (Thiery & Scherrer, 2009) — tuned for SRS
// Order: landingHeight, erodedPieceCells, rowTransitions, colTransitions,
//        holes, cumulativeWells, holeDepth, rowsWithHoles,
//        peakSum, cliffinessSquared, maxHeight
export const BCTS_WEIGHTS: Weights = [
  -12.63, //  landingHeight
  6.60, //  erodedPieceCells
  -9.22, //  rowTransitions
  -19.77, //  colTransitions
  -13.08, //  holes
  -10.49, //  cumulativeWells
  -1.61, //  holeDepth
  -24.04, //  rowsWithHoles
  0.0, //  peakSum            (SRS handles peaks via wall kicks)
  0.0, //  cliffinessSquared  (SRS tolerant of height differences)
  0.0, //  maxHeight
];

// NRS weights: without wall kicks, towers and holes are lethal.
// peakSum is the main tower fix — directly penalizes columns protruding
// above neighbors with a cumulative formula matching cumulativeWells.
export const NRS_WEIGHTS: Weights = [
  -18.0, //  landingHeight      (keep placements low)
  6.60, //  erodedPieceCells   (reward line clears)
  -9.22, //  rowTransitions     (now with walls=FULL, standard BCTS)
  -19.77, //  colTransitions
  -26.0, //  holes              (2x — nearly unfixable without kicks)
  -20.0, //  cumulativeWells    (2x — now with walls=FULL)
  -8.0, //  holeDepth          (5x — buried holes are permanent)
  -36.0, //  rowsWithHoles
  -15.0, //  peakSum            (strong tower penalty — main fix)
  -1.5, //  cliffinessSquared  (quadratic height diff penalty)
  -3.0, //  maxHeight
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
    weights[8] * features.peakSum +
    weights[9] * features.cliffinessSquared +
    weights[10] * features.maxHeight
  );
}
