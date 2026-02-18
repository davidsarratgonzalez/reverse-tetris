import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board';
import { Piece, Rotation } from '../../src/core/types';
import { getSpawnPosition, PIECE_CELLS } from '../../src/core/constants';
import { tryRotate } from '../../src/core/srs';
import { generatePlacements } from '../../src/ai/placement';
import { planAnimation, type AnimationKeyframe } from '../../web/src/engine/AnimationPlanner';

const W = 10;
const H = 20;
const TOTAL_H = H + 4;

/**
 * Verify that every consecutive pair of keyframes represents a legal move:
 * - 'spawn': piece must not collide at spawn position
 * - 'move' (left/right): piece moved exactly 1 cell horizontally, no collision
 * - 'rotate': piece rotated via SRS (tryRotate must succeed and match position)
 * - 'drop': piece moved exactly 1 cell down, no collision
 * - 'lock': same position as previous frame (final resting)
 */
function assertLegalPath(board: Board, keyframes: AnimationKeyframe[]): void {
  expect(keyframes.length).toBeGreaterThanOrEqual(2); // at least spawn + lock

  // First frame must be spawn
  const first = keyframes[0]!;
  expect(first.type).toBe('spawn');
  expect(board.collides(first.piece, first.rotation, first.x, first.y)).toBe(false);

  // Last frame must be lock
  const last = keyframes[keyframes.length - 1]!;
  expect(last.type).toBe('lock');
  expect(board.collides(last.piece, last.rotation, last.x, last.y)).toBe(false);

  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1]!;
    const curr = keyframes[i]!;
    const piece = curr.piece;

    // Piece type must be consistent
    expect(curr.piece).toBe(first.piece);

    // Current position must not collide
    expect(board.collides(piece, curr.rotation, curr.x, curr.y)).toBe(false);

    switch (curr.type) {
      case 'move': {
        // Horizontal move: same y, same rotation, x changed by exactly 1
        expect(curr.rotation).toBe(prev.rotation);
        expect(curr.y).toBe(prev.y);
        expect(Math.abs(curr.x - prev.x)).toBe(1);
        break;
      }
      case 'drop': {
        // Soft drop: same x, same rotation, y decreased by exactly 1
        expect(curr.rotation).toBe(prev.rotation);
        expect(curr.x).toBe(prev.x);
        expect(prev.y - curr.y).toBe(1);
        break;
      }
      case 'rotate': {
        // Rotation: must match tryRotate result (SRS wall kicks)
        // Try CW first, then CCW
        const cwResult = tryRotate(board, piece, prev.rotation, 1, prev.x, prev.y);
        const ccwResult = tryRotate(board, piece, prev.rotation, -1, prev.x, prev.y);

        const matchesCW = cwResult &&
          cwResult.rotation === curr.rotation &&
          cwResult.x === curr.x &&
          cwResult.y === curr.y;

        const matchesCCW = ccwResult &&
          ccwResult.rotation === curr.rotation &&
          ccwResult.x === curr.x &&
          ccwResult.y === curr.y;

        expect(matchesCW || matchesCCW).toBe(true);
        break;
      }
      case 'lock': {
        // Lock frame: same position as previous frame
        expect(curr.x).toBe(prev.x);
        expect(curr.y).toBe(prev.y);
        expect(curr.rotation).toBe(prev.rotation);
        break;
      }
    }
  }
}

describe('AnimationPlanner legality', () => {
  it('should produce legal paths for all placements on an empty board', () => {
    const board = new Board(W, TOTAL_H);

    for (const piece of [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L]) {
      const spawn = getSpawnPosition(piece, W, H);
      const placements = generatePlacements(board, piece, spawn.x, spawn.y);
      expect(placements.length).toBeGreaterThan(0);

      for (const placement of placements) {
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        assertLegalPath(board, keyframes);

        // Final lock frame must match target placement
        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(placement.x);
        expect(lock.y).toBe(placement.y);
        expect(lock.rotation).toBe(placement.rotation);
      }
    }
  });

  it('should produce legal paths on a board with obstacles', () => {
    const board = new Board(W, TOTAL_H);

    // Build a jagged surface: columns 0-4 filled to height 5, columns 5-9 to height 3
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        board.set(x, y, true);
      }
    }
    for (let y = 0; y < 3; y++) {
      for (let x = 5; x < W; x++) {
        board.set(x, y, true);
      }
    }

    for (const piece of [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L]) {
      const spawn = getSpawnPosition(piece, W, H);
      const placements = generatePlacements(board, piece, spawn.x, spawn.y);

      for (const placement of placements) {
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        assertLegalPath(board, keyframes);

        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(placement.x);
        expect(lock.y).toBe(placement.y);
        expect(lock.rotation).toBe(placement.rotation);
      }
    }
  });

  it('should produce legal paths on a nearly full board', () => {
    const board = new Board(W, TOTAL_H);

    // Fill rows 0-15 except column 0 (leave a well for I piece etc.)
    for (let y = 0; y < 16; y++) {
      for (let x = 1; x < W; x++) {
        board.set(x, y, true);
      }
    }

    for (const piece of [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L]) {
      const spawn = getSpawnPosition(piece, W, H);
      const placements = generatePlacements(board, piece, spawn.x, spawn.y);

      for (const placement of placements) {
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        assertLegalPath(board, keyframes);

        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(placement.x);
        expect(lock.y).toBe(placement.y);
        expect(lock.rotation).toBe(placement.rotation);
      }
    }
  });

  it('should produce legal paths on a board requiring BFS (overhangs)', () => {
    const board = new Board(W, TOTAL_H);

    // Create an overhang: row 2 filled except column 3, rows 0-1 fully filled except col 3
    // This forces pieces to navigate around the gap
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < W; x++) {
        if (x !== 3) board.set(x, y, true);
      }
    }
    // Add a ceiling over column 3 at row 3 (partial)
    board.set(2, 3, true);
    board.set(4, 3, true);

    for (const piece of [Piece.I, Piece.T, Piece.J, Piece.L]) {
      const spawn = getSpawnPosition(piece, W, H);
      const placements = generatePlacements(board, piece, spawn.x, spawn.y);

      for (const placement of placements) {
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        assertLegalPath(board, keyframes);

        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(placement.x);
        expect(lock.y).toBe(placement.y);
        expect(lock.rotation).toBe(placement.rotation);
      }
    }
  });

  it('should start at spawn position', () => {
    const board = new Board(W, TOTAL_H);
    const piece = Piece.T;
    const spawn = getSpawnPosition(piece, W, H);
    const placements = generatePlacements(board, piece, spawn.x, spawn.y);

    for (const placement of placements) {
      const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
      const first = keyframes[0]!;

      expect(first.type).toBe('spawn');
      expect(first.x).toBe(spawn.x);
      expect(first.y).toBe(spawn.y);
      expect(first.rotation).toBe(Rotation.R0);
    }
  });

  it('BFS should produce a legal path with rotation, movement and drops', () => {
    const board = new Board(W, TOTAL_H);
    const piece = Piece.T;

    // Target: R2 at column 0 — BFS finds shortest legal path
    const keyframes = planAnimation(
      board,
      { piece, rotation: Rotation.R2, x: 0, y: 0, held: false },
      W, H,
    );

    assertLegalPath(board, keyframes);

    // Should contain rotations, moves, and drops
    const types = keyframes.slice(1, -1).map(f => f.type); // exclude spawn and lock
    expect(types.length).toBeGreaterThan(0);
    // Must reach target — last step before lock should be at target position
    const lastStep = keyframes[keyframes.length - 2]!;
    expect(lastStep.x).toBe(0);
    expect(lastStep.y).toBe(0);
    expect(lastStep.rotation).toBe(Rotation.R2);
  });

  it('should handle same-position placement (spawn = target)', () => {
    const board = new Board(W, TOTAL_H);
    const piece = Piece.O;
    const spawn = getSpawnPosition(piece, W, H);

    // Place at spawn position — should be spawn + lock with minimal path
    const keyframes = planAnimation(
      board,
      { piece, rotation: Rotation.R0, x: spawn.x, y: 0, held: false },
      W, H,
    );

    assertLegalPath(board, keyframes);
    const lock = keyframes[keyframes.length - 1]!;
    expect(lock.y).toBe(0);
  });

  it('every frame should have no collision with the board', () => {
    const board = new Board(W, TOTAL_H);
    // Random surface
    for (let x = 0; x < W; x++) {
      const height = Math.floor(Math.random() * 8);
      for (let y = 0; y < height; y++) {
        board.set(x, y, true);
      }
    }

    for (const piece of [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L]) {
      const spawn = getSpawnPosition(piece, W, H);
      const placements = generatePlacements(board, piece, spawn.x, spawn.y);

      for (const placement of placements) {
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);

        for (const frame of keyframes) {
          expect(
            board.collides(frame.piece, frame.rotation, frame.x, frame.y),
          ).toBe(false);
        }
      }
    }
  });
});
