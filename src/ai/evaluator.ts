import type { FeatureVector } from '../core/types.js';

export type Weights = readonly [number, number, number, number, number, number, number, number];

// BCTS default weights (Thiery & Scherrer, 2009)
// Order: landingHeight, erodedPieceCells, rowTransitions, colTransitions,
//        holes, cumulativeWells, holeDepth, rowsWithHoles
export const BCTS_WEIGHTS: Weights = [
  -12.63, //  landingHeight
  6.60, //  erodedPieceCells
  -9.22, //  rowTransitions
  -19.77, //  colTransitions
  -13.08, //  holes
  -10.49, //  cumulativeWells
  -1.61, //  holeDepth
  -24.04, //  rowsWithHoles
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
    weights[7] * features.rowsWithHoles
  );
}
