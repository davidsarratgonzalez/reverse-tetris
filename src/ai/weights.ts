import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Weights } from './evaluator.js';

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

export async function loadWeights(path: string): Promise<Weights> {
  const raw = await readFile(path, 'utf-8');
  const arr = JSON.parse(raw) as number[];
  if (!Array.isArray(arr) || arr.length !== 8) {
    throw new Error(`Invalid weights file: expected array of 8 numbers, got ${JSON.stringify(arr).slice(0, 100)}`);
  }
  return arr as unknown as Weights;
}

export async function saveWeights(path: string, weights: Weights): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify([...weights], null, 2) + '\n');
}
