import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BCTS_WEIGHTS, type Weights } from './evaluator.js';

// Re-export for backward compatibility
export { BCTS_WEIGHTS };

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
