import type { FeatureVector } from '../core/types.js';

export type Weights = readonly [number, number, number, number, number, number, number, number];

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
