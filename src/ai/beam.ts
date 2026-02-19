import { Game } from '../core/game.js';
import type { Board } from '../core/board.js';
import type { TryRotateFn } from '../core/rotation.js';
import { tryRotate } from '../core/srs.js';
import { getSpawnPosition } from '../core/constants.js';
import { Piece, Rotation, type GameSnapshot, type Placement, type Vec2 } from '../core/types.js';
import { evaluate, type Weights } from './evaluator.js';
import { extractFeatures } from './features.js';
import { generatePlacements } from './placement.js';

export interface BeamSearchConfig {
  /** How many pieces to look ahead (capped by known preview length). */
  depth: number;
  /** Top-B candidates kept per level. */
  beamWidth: number;
}

interface BeamCandidate {
  board: Board;
  score: number;
  firstAction: Placement;
  holdPiece: Piece | null;
  nextPieceIndex: number;
}

/**
 * Beam search controller for Modern Guideline mode.
 *
 * With 5 known preview pieces (deterministic future), beam search is more
 * efficient than expectimax (no chance nodes needed). At each level the
 * algorithm expands all placements of the current piece (plus hold variants),
 * evaluates using BCTS features, and keeps the top-B candidates.
 *
 * Returns the first action of the highest-scoring candidate after exploring
 * up to `depth` levels.
 */
export function beamSearchSelect(
  snapshot: GameSnapshot,
  weights: Weights,
  config: BeamSearchConfig = { depth: 5, beamWidth: 100 },
  rotateFn?: TryRotateFn,
  spawnRotFn?: (piece: Piece) => Rotation,
  spawnPosFn?: (piece: Piece, width: number, height: number) => Vec2,
): Placement | null {
  const { board, currentPiece, preview, height, holdPiece, holdUsed, allowHold } = snapshot;
  const width = board.width;
  const doInitialDrop = snapshot.initialDrop ?? false;
  const truncAbove = snapshot.truncateLock ? height : undefined;

  const rFn = rotateFn ?? tryRotate;
  const srFn = spawnRotFn ?? (() => Rotation.R0);
  const spFn = spawnPosFn ?? getSpawnPosition;

  // Level 0: expand current piece (and hold variant if allowed)
  let candidates: BeamCandidate[] = [];

  // Option A: place current piece directly
  expandPiece(board, currentPiece, height, width, weights, rFn, srFn, spFn,
    candidates, null, holdPiece, 0, false, doInitialDrop, truncAbove);

  // Option B: hold current piece, play hold/preview piece
  if (allowHold && !holdUsed) {
    if (holdPiece !== null) {
      // Swap: hold gets currentPiece, play holdPiece
      expandPiece(board, holdPiece, height, width, weights, rFn, srFn, spFn,
        candidates, null, currentPiece, 0, true, doInitialDrop, truncAbove);
    } else if (preview.length > 0) {
      // No hold yet: hold currentPiece, play preview[0]
      expandPiece(board, preview[0]!, height, width, weights, rFn, srFn, spFn,
        candidates, null, currentPiece, 1, true, doInitialDrop, truncAbove);
    }
  }

  if (candidates.length === 0) return null;

  candidates = pruneBeam(candidates, config.beamWidth);

  // Levels 1..depth-1: expand with next known piece
  const maxDepth = Math.min(config.depth, preview.length + 1);

  for (let level = 1; level < maxDepth; level++) {
    const nextCandidates: BeamCandidate[] = [];

    for (const c of candidates) {
      const pieceIdx = c.nextPieceIndex;
      if (pieceIdx >= preview.length) continue;

      const piece = preview[pieceIdx]!;

      // Option A: place this piece
      expandPiece(c.board, piece, height, width, weights, rFn, srFn, spFn,
        nextCandidates, c.firstAction, c.holdPiece, pieceIdx + 1, false, doInitialDrop, truncAbove);

      // Option B: hold swap
      if (allowHold) {
        if (c.holdPiece !== null) {
          // Swap: hold gets piece, play holdPiece
          expandPiece(c.board, c.holdPiece, height, width, weights, rFn, srFn, spFn,
            nextCandidates, c.firstAction, piece, pieceIdx + 1, true, doInitialDrop, truncAbove);
        } else if (pieceIdx + 1 < preview.length) {
          // No hold: hold piece, play next preview
          expandPiece(c.board, preview[pieceIdx + 1]!, height, width, weights, rFn, srFn, spFn,
            nextCandidates, c.firstAction, piece, pieceIdx + 2, true, doInitialDrop, truncAbove);
        }
      }
    }

    if (nextCandidates.length === 0) break;
    candidates = pruneBeam(nextCandidates, config.beamWidth);
  }

  // Return the first action of the best candidate
  let best: BeamCandidate | null = null;
  for (const c of candidates) {
    if (best === null || c.score > best.score) best = c;
  }

  return best?.firstAction ?? null;
}

function expandPiece(
  board: Board,
  piece: Piece,
  height: number,
  width: number,
  weights: Weights,
  rotateFn: TryRotateFn,
  spawnRotFn: (piece: Piece) => Rotation,
  spawnPosFn: (piece: Piece, width: number, height: number) => Vec2,
  candidates: BeamCandidate[],
  firstAction: Placement | null,
  holdPiece: Piece | null,
  nextPieceIndex: number,
  held: boolean,
  initialDrop: boolean,
  truncAbove: number | undefined,
): void {
  const spawnRot = spawnRotFn(piece);
  const rawSpawn = spawnPosFn(piece, width, height);

  // Block-out check
  if (board.collides(piece, spawnRot, rawSpawn.x, rawSpawn.y)) return;

  // Apply initial drop
  let spawnY = rawSpawn.y;
  if (initialDrop && !board.collides(piece, spawnRot, rawSpawn.x, spawnY - 1)) {
    spawnY--;
  }

  const placements = generatePlacements(board, piece, rawSpawn.x, spawnY, rotateFn, spawnRot);

  for (const p of placements) {
    const sim = Game.simulatePlacement(board, p.piece, p.rotation, p.x, p.y, height, truncAbove);
    if (!sim) continue;

    const cellYs = sim.landingCells.map(c => c.y);
    const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
    const score = evaluate(features, weights);

    const action: Placement = { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held };

    candidates.push({
      board: sim.board,
      score,
      firstAction: firstAction ?? action,
      holdPiece,
      nextPieceIndex,
    });
  }
}

function pruneBeam(candidates: BeamCandidate[], beamWidth: number): BeamCandidate[] {
  if (candidates.length <= beamWidth) return candidates;
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, beamWidth);
}
