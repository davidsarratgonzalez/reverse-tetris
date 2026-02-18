import { Board } from '../core/board.js';
import { getSpawnPosition } from '../core/constants.js';
import { Game } from '../core/game.js';
import { createRandomizer, type Randomizer } from '../core/randomizer.js';
import { Piece, Rotation, type GameConfig, type GameSnapshot, type Placement } from '../core/types.js';
import { evaluate, type Weights } from './evaluator.js';
import { extractFeatures } from './features.js';
import { generatePlacements } from './placement.js';

export interface BeamSearchConfig {
  width: number; // B: beam width (number of states to keep per depth level)
  depth: number; // D: lookahead depth (number of pieces to look ahead)
}

interface BeamNode {
  board: Board;
  score: number; // cumulative evaluation score
  firstAction: Placement; // the action chosen at depth 0 (what we'll actually execute)
  holdPiece: Piece | null;
  holdUsed: boolean;
  // The next pieces available at this node
  nextPieces: Piece[];
  // Index into nextPieces for the current piece at this depth
  pieceIndex: number;
}

export function beamSearch(
  snapshot: GameSnapshot,
  weights: Weights,
  config: BeamSearchConfig,
  gameConfig?: Partial<GameConfig>,
): Placement | null {
  const { board, currentPiece, holdPiece, holdUsed, allowHold, preview } = snapshot;
  const width = board.width;
  const visibleHeight = board.totalHeight - 4;

  // Build the sequence of pieces we know about
  const knownPieces: Piece[] = [currentPiece, ...preview];

  // If depth is 0 or 1, just do greedy
  const effectiveDepth = Math.min(config.depth, knownPieces.length);
  if (effectiveDepth <= 0) return null;

  // Initialize beam with the root state
  let beam: BeamNode[] = [
    {
      board,
      score: 0,
      firstAction: null as unknown as Placement, // will be set at depth 0
      holdPiece,
      holdUsed,
      nextPieces: knownPieces,
      pieceIndex: 0,
    },
  ];

  for (let d = 0; d < effectiveDepth; d++) {
    const candidates: BeamNode[] = [];

    for (const node of beam) {
      if (node.pieceIndex >= node.nextPieces.length) continue;
      const currentPc = node.nextPieces[node.pieceIndex]!;

      // Generate placements for the current piece (no hold)
      expandPlacements(
        node,
        currentPc,
        false,
        d,
        width,
        visibleHeight,
        weights,
        candidates,
      );

      // Generate placements for hold piece (if hold is allowed)
      if (allowHold && !node.holdUsed) {
        const holdTarget = node.holdPiece ?? node.nextPieces[node.pieceIndex + 1];
        if (holdTarget !== undefined) {
          expandPlacements(
            node,
            holdTarget,
            true,
            d,
            width,
            visibleHeight,
            weights,
            candidates,
          );
        }
      }
    }

    if (candidates.length === 0) break;

    // Sort by score descending, keep top B
    candidates.sort((a, b) => b.score - a.score);
    beam = candidates.slice(0, config.width);
  }

  if (beam.length === 0) return null;

  // Return the first action of the best beam node
  return beam[0]!.firstAction;
}

function expandPlacements(
  node: BeamNode,
  piece: Piece,
  useHold: boolean,
  depth: number,
  boardWidth: number,
  visibleHeight: number,
  weights: Weights,
  candidates: BeamNode[],
): void {
  const spawn = getSpawnPosition(piece, boardWidth, visibleHeight);
  const placements = generatePlacements(node.board, piece, spawn.x, spawn.y);

  for (const p of placements) {
    const sim = Game.simulatePlacement(node.board, p.piece, p.rotation, p.x, p.y);
    if (!sim) continue;

    const cellYs = sim.landingCells.map((c) => c.y);
    const features = extractFeatures(sim.board, cellYs, sim.linesCleared, sim.pieceCellsInCleared);
    const evalScore = evaluate(features, weights);

    const action: Placement = { piece: p.piece, rotation: p.rotation, x: p.x, y: p.y, held: useHold };

    // Compute new hold state
    let newHoldPiece = node.holdPiece;
    let newPieceIndex = node.pieceIndex + 1;
    if (useHold) {
      if (node.holdPiece !== null) {
        // Swapped current with hold
        newHoldPiece = node.nextPieces[node.pieceIndex]!;
        // Piece index stays the same (we used the hold piece, not the next piece)
        newPieceIndex = node.pieceIndex + 1;
      } else {
        // Put current into hold, used next piece
        newHoldPiece = node.nextPieces[node.pieceIndex]!;
        newPieceIndex = node.pieceIndex + 2; // consumed current (to hold) + next (to play)
      }
    }

    candidates.push({
      board: sim.board,
      score: node.score + evalScore + sim.linesCleared,
      firstAction: depth === 0 ? action : node.firstAction,
      holdPiece: newHoldPiece,
      holdUsed: false, // reset after lock
      nextPieces: node.nextPieces,
      pieceIndex: newPieceIndex,
    });
  }
}
