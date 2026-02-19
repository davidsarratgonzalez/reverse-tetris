import { getSpawnPosition, getSpawnPositionNRS } from './constants.js';
import { tryRotateNRS, NRS_SPAWN_ROTATION } from './nrs.js';
import type { TryRotateFn } from './rotation.js';
import { tryRotate } from './srs.js';
import { Piece, Rotation, type GameConfig, type Vec2 } from './types.js';
import { BCTS_WEIGHTS, NRS_WEIGHTS, type Weights } from '../ai/evaluator.js';

export type GameMode = 'classic' | 'modern';

export interface ModeConfig {
  mode: GameMode;
  gameConfig: Partial<GameConfig>;
  tryRotate: TryRotateFn;
  getSpawnRotation: (piece: Piece) => Rotation;
  getSpawnPosition: (piece: Piece, width: number, height: number) => Vec2;
  weights: Weights;
  initialPicks: number;
  showGhost: boolean;
  visibleBuffer: number;
  aiType: 'expectimax' | 'beam';
  aiConfig: { depth: number; beamWidth?: number };
}

export function classicMode(): ModeConfig {
  return {
    mode: 'classic',
    gameConfig: {
      rotationSystem: 'nrs',
      bufferRows: 2,       // NES has 2 hidden rows above visible area
      previewCount: 1,
      allowHold: false,
      initialDrop: false,   // NES has no initial drop
      truncateLock: true,   // NES truncates cells above visible height
    },
    tryRotate: tryRotateNRS,
    getSpawnRotation: (p: Piece) => NRS_SPAWN_ROTATION[p]!,
    getSpawnPosition: getSpawnPositionNRS,
    weights: NRS_WEIGHTS,
    initialPicks: 2,
    showGhost: false,
    visibleBuffer: 0,
    aiType: 'expectimax',
    aiConfig: { depth: 2 },
  };
}

export function modernMode(): ModeConfig {
  return {
    mode: 'modern',
    gameConfig: {
      rotationSystem: 'srs',
      bufferRows: 20,
      previewCount: 5,
      allowHold: true,
      initialDrop: true,    // Guideline: drop 1 row after spawn if possible
      truncateLock: false,
    },
    tryRotate,
    getSpawnRotation: () => Rotation.R0,
    getSpawnPosition,
    weights: BCTS_WEIGHTS,
    initialPicks: 6,
    showGhost: true,
    visibleBuffer: 3,
    aiType: 'beam',
    aiConfig: { depth: 5, beamWidth: 100 },
  };
}
