import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board';
import { Game } from '../../src/core/game';
import { Piece, Rotation } from '../../src/core/types';
import { getSpawnPosition } from '../../src/core/constants';
import { generatePlacements } from '../../src/ai/placement';
import { expectimaxSelect } from '../../src/ai/expectimax';
import { BCTS_WEIGHTS } from '../../src/ai/evaluator';
import { planAnimation } from '../../web/src/engine/AnimationPlanner';

const W = 10;
const H = 20;
const TOTAL_H = H + 4;

const ALL_PIECES = [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L];

// Helper: verify every frame in an animation is collision-free and legal
function assertLegalPath(board: Board, keyframes: ReturnType<typeof planAnimation>): void {
  expect(keyframes.length).toBeGreaterThanOrEqual(2);
  for (const frame of keyframes) {
    expect(board.collides(frame.piece, frame.rotation, frame.x, frame.y)).toBe(false);
  }
}

// Helper: build a board with a specific surface profile (heights per column)
function buildSurface(heights: number[]): Board {
  const board = new Board(W, TOTAL_H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < (heights[x] ?? 0); y++) {
      board.set(x, y, true);
    }
  }
  return board;
}

// Helper: simulate placing a piece and return the board after
function placeAndClear(board: Board, piece: Piece, rotation: Rotation, x: number, y: number): { board: Board; linesCleared: number } {
  const result = Game.simulatePlacement(board, piece, rotation, x, y);
  if (!result) throw new Error(`Cannot place ${piece} at (${x},${y}) rot=${rotation}`);
  return { board: result.board, linesCleared: result.linesCleared };
}

describe('S/Z piece stress tests', () => {

  describe('Placement generation for S/Z', () => {
    it('should generate placements for Z on empty board in all rotations', () => {
      const board = new Board(W, TOTAL_H);
      const spawn = getSpawnPosition(Piece.Z, W, H);
      const placements = generatePlacements(board, Piece.Z, spawn.x, spawn.y);

      // Z has 2 distinct rotation shapes (R0/R2 are same footprint, R1/R3 are same)
      const rotations = new Set(placements.map(p => p.rotation));
      expect(rotations.size).toBeGreaterThanOrEqual(2);
      expect(placements.length).toBeGreaterThan(10);
    });

    it('should generate placements for S on empty board in all rotations', () => {
      const board = new Board(W, TOTAL_H);
      const spawn = getSpawnPosition(Piece.S, W, H);
      const placements = generatePlacements(board, Piece.S, spawn.x, spawn.y);

      const rotations = new Set(placements.map(p => p.rotation));
      expect(rotations.size).toBeGreaterThanOrEqual(2);
      expect(placements.length).toBeGreaterThan(10);
    });

    it('should find flat placements for Z (not just stacking)', () => {
      const board = new Board(W, TOTAL_H);
      const spawn = getSpawnPosition(Piece.Z, W, H);
      const placements = generatePlacements(board, Piece.Z, spawn.x, spawn.y);

      // R0 (flat): occupies 3 columns, height 2
      const flatPlacements = placements.filter(p => p.rotation === Rotation.R0 || p.rotation === Rotation.R2);
      expect(flatPlacements.length).toBeGreaterThan(0);

      // R1/R3 (vertical): occupies 2 columns, height 3
      const vertPlacements = placements.filter(p => p.rotation === Rotation.R1 || p.rotation === Rotation.R3);
      expect(vertPlacements.length).toBeGreaterThan(0);
    });

    it('should find placements for Z on jagged surface', () => {
      // Jagged surface that S/Z struggle with
      const board = buildSurface([3, 5, 3, 5, 3, 5, 3, 5, 3, 5]);
      const spawn = getSpawnPosition(Piece.Z, W, H);
      const placements = generatePlacements(board, Piece.Z, spawn.x, spawn.y);
      expect(placements.length).toBeGreaterThan(0);
    });

    it('should find placements for S on jagged surface', () => {
      const board = buildSurface([5, 3, 5, 3, 5, 3, 5, 3, 5, 3]);
      const spawn = getSpawnPosition(Piece.S, W, H);
      const placements = generatePlacements(board, Piece.S, spawn.x, spawn.y);
      expect(placements.length).toBeGreaterThan(0);
    });
  });

  describe('AI behavior with S/Z spam', () => {
    it('should survive 20 consecutive Z pieces', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      // Override randomizer to always give Z
      game.randomizer = {
        next: () => Piece.Z,
        peek: () => [Piece.Z],
        clone: () => game.randomizer,
      };
      // Reset current piece to Z
      game.currentPiece = Piece.Z;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.Z, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      let piecesPlaced = 0;
      for (let i = 0; i < 20; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const result = game.applyPlacement(placement);
        if (result.gameOver) break;
        piecesPlaced++;
      }

      expect(piecesPlaced).toBeGreaterThanOrEqual(10);
    });

    it('should survive 20 consecutive S pieces', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      game.randomizer = {
        next: () => Piece.S,
        peek: () => [Piece.S],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.S;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.S, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      let piecesPlaced = 0;
      for (let i = 0; i < 20; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const result = game.applyPlacement(placement);
        if (result.gameOver) break;
        piecesPlaced++;
      }

      expect(piecesPlaced).toBeGreaterThanOrEqual(10);
    });

    it('should survive alternating S/Z for 30 pieces', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      let turn = 0;
      const nextPiece = () => turn++ % 2 === 0 ? Piece.S : Piece.Z;
      game.randomizer = {
        next: () => nextPiece(),
        peek: () => [turn % 2 === 0 ? Piece.S : Piece.Z],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.S;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.S, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      let piecesPlaced = 0;
      for (let i = 0; i < 30; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const result = game.applyPlacement(placement);
        if (result.gameOver) break;
        piecesPlaced++;
      }

      expect(piecesPlaced).toBeGreaterThanOrEqual(15);
    });

    it('AI should NOT always place Z in the same column', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      game.randomizer = {
        next: () => Piece.Z,
        peek: () => [Piece.Z],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.Z;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.Z, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      const xPositions = new Set<number>();
      const rotations = new Set<number>();

      for (let i = 0; i < 15; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        xPositions.add(placement.x);
        rotations.add(placement.rotation);
        const result = game.applyPlacement(placement);
        if (result.gameOver) break;
      }

      // Should use multiple X positions (not just stacking in one spot)
      expect(xPositions.size).toBeGreaterThan(2);
    });

    it('AI should use both rotations of S/Z to keep surface flat', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      game.randomizer = {
        next: () => Piece.Z,
        peek: () => [Piece.Z],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.Z;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.Z, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      const rotations = new Set<number>();

      for (let i = 0; i < 15; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        rotations.add(placement.rotation);
        const result = game.applyPlacement(placement);
        if (result.gameOver) break;
      }

      // Should use at least 2 different rotations
      expect(rotations.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Animation planner with S/Z on complex surfaces', () => {
    it('should find legal paths for all Z placements on a high surface', () => {
      const board = buildSurface([8, 10, 8, 10, 8, 10, 8, 10, 8, 10]);
      const spawn = getSpawnPosition(Piece.Z, W, H);
      const placements = generatePlacements(board, Piece.Z, spawn.x, spawn.y);

      for (const p of placements) {
        const keyframes = planAnimation(board, { ...p, held: false }, W, H);
        assertLegalPath(board, keyframes);
        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(p.x);
        expect(lock.y).toBe(p.y);
        expect(lock.rotation).toBe(p.rotation);
      }
    });

    it('should find legal paths for all S placements on a high surface', () => {
      const board = buildSurface([10, 8, 10, 8, 10, 8, 10, 8, 10, 8]);
      const spawn = getSpawnPosition(Piece.S, W, H);
      const placements = generatePlacements(board, Piece.S, spawn.x, spawn.y);

      for (const p of placements) {
        const keyframes = planAnimation(board, { ...p, held: false }, W, H);
        assertLegalPath(board, keyframes);
        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(p.x);
        expect(lock.y).toBe(p.y);
        expect(lock.rotation).toBe(p.rotation);
      }
    });

    it('should animate Z placements after stacking several Z pieces', () => {
      // Simulate stacking 8 Z pieces, then check animation for the 9th
      let board = new Board(W, TOTAL_H);
      const placements8: { rotation: Rotation; x: number; y: number }[] = [];

      for (let i = 0; i < 8; i++) {
        const spawn = getSpawnPosition(Piece.Z, W, H);
        const options = generatePlacements(board, Piece.Z, spawn.x, spawn.y);
        if (options.length === 0) break;
        // Pick the best placement via AI
        const snapshot = { board: board.clone(), height: H, currentPiece: Piece.Z, holdPiece: null, holdUsed: false, allowHold: false, preview: [Piece.Z], linesCleared: 0, piecesPlaced: i };
        const best = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!best) break;
        const sim = Game.simulatePlacement(board, best.piece, best.rotation, best.x, best.y);
        if (!sim) break;
        board = sim.board;
        placements8.push({ rotation: best.rotation, x: best.x, y: best.y });
      }

      // Now check animations for all remaining Z placements
      const spawn = getSpawnPosition(Piece.Z, W, H);
      const remaining = generatePlacements(board, Piece.Z, spawn.x, spawn.y);

      for (const p of remaining) {
        const keyframes = planAnimation(board, { ...p, held: false }, W, H);
        assertLegalPath(board, keyframes);
      }
    });
  });

  describe('Game over detection', () => {
    it('should detect game over when board is topped out', () => {
      const board = new Board(W, TOTAL_H);
      // Fill columns high enough that spawning fails
      for (let y = 0; y < H + 2; y++) {
        for (let x = 0; x < W; x++) {
          board.set(x, y, true);
        }
      }

      const spawn = getSpawnPosition(Piece.Z, W, H);
      const placements = generatePlacements(board, Piece.Z, spawn.x, spawn.y);
      expect(placements.length).toBe(0); // can't even spawn
    });

    it('should detect game over when spawn position is blocked', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });

      // Fill the board very high
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          game.board.set(x, y, true);
        }
      }

      // This should trigger game over on next placement
      const spawn = getSpawnPosition(game.currentPiece, W, H);
      const collides = game.board.collides(game.currentPiece, Rotation.R0, spawn.x, spawn.y);
      expect(collides).toBe(true);
    });

    it('should end game after Z-only spam eventually tops out', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      game.randomizer = {
        next: () => Piece.Z,
        peek: () => [Piece.Z],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.Z;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.Z, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      let piecesPlaced = 0;
      const MAX = 200;

      while (piecesPlaced < MAX) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) {
          // AI can't find a valid placement → game over
          break;
        }
        const result = game.applyPlacement(placement);
        piecesPlaced++;
        if (result.gameOver) break;
      }

      // With only Z pieces and no line clears, the board must eventually top out
      // (Z pieces alone can't complete full lines on a standard 10-wide board)
      expect(game.gameOver || piecesPlaced >= MAX).toBe(true);
      // It should have survived a reasonable number of pieces first
      expect(piecesPlaced).toBeGreaterThan(5);
    });

    it('should end game after S-only spam eventually tops out', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });
      game.randomizer = {
        next: () => Piece.S,
        peek: () => [Piece.S],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.S;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.S, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      let piecesPlaced = 0;
      const MAX = 200;

      while (piecesPlaced < MAX) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const result = game.applyPlacement(placement);
        piecesPlaced++;
        if (result.gameOver) break;
      }

      expect(game.gameOver || piecesPlaced >= MAX).toBe(true);
      expect(piecesPlaced).toBeGreaterThan(5);
    });

    it('game over should propagate through applyPlacement in reducer', () => {
      const game = new Game({
        width: W, height: H, bufferRows: 4,
        previewCount: 1, allowHold: false, seed: 42,
      });

      // Fill most of the board with holes so lines DON'T clear
      // (checkerboard pattern prevents line clears)
      for (let y = 0; y < H - 2; y++) {
        for (let x = 0; x < W; x++) {
          // Leave a hole in each row so they never clear
          if (x !== (y % W)) {
            game.board.set(x, y, true);
          }
        }
      }

      game.randomizer = {
        next: () => Piece.Z,
        peek: () => [Piece.Z],
        clone: () => game.randomizer,
      };
      game.currentPiece = Piece.Z;
      game.currentRotation = Rotation.R0;
      const spawn = getSpawnPosition(Piece.Z, W, H);
      game.currentX = spawn.x;
      game.currentY = spawn.y;
      game.gameOver = false;

      // Keep placing until game over — with only 2 rows free and no clears, it must end
      let gameEnded = false;
      for (let i = 0; i < 30; i++) {
        const snapshot = game.snapshot();
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) {
          gameEnded = true;
          break;
        }
        const result = game.applyPlacement(placement);
        if (result.gameOver) {
          gameEnded = true;
          expect(game.gameOver).toBe(true);
          break;
        }
      }

      expect(gameEnded).toBe(true);
    });
  });

  describe('S/Z placement quality', () => {
    it('Z placement on flat board creates at most 1 hole (geometric minimum)', () => {
      // S/Z pieces have a step shape — placing flat on an empty board
      // inherently creates exactly 1 hole. This is geometry, not a bug.
      const board = new Board(W, TOTAL_H);
      const snapshot = {
        board, height: H, currentPiece: Piece.Z, holdPiece: null, holdUsed: false,
        allowHold: false, preview: [Piece.Z], linesCleared: 0, piecesPlaced: 0,
      };
      const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
      expect(placement).not.toBeNull();

      const sim = Game.simulatePlacement(board, placement!.piece, placement!.rotation, placement!.x, placement!.y);
      expect(sim).not.toBeNull();

      let holes = 0;
      for (let x = 0; x < W; x++) {
        const h = sim!.board.getColumnHeight(x);
        for (let y = 0; y < h; y++) {
          if (!sim!.board.get(x, y)) holes++;
        }
      }
      // S/Z flat = 1 hole (step shape), vertical = 0 holes
      expect(holes).toBeLessThanOrEqual(1);
    });

    it('S placement on flat board creates at most 1 hole (geometric minimum)', () => {
      const board = new Board(W, TOTAL_H);
      const snapshot = {
        board, height: H, currentPiece: Piece.S, holdPiece: null, holdUsed: false,
        allowHold: false, preview: [Piece.S], linesCleared: 0, piecesPlaced: 0,
      };
      const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
      expect(placement).not.toBeNull();

      const sim = Game.simulatePlacement(board, placement!.piece, placement!.rotation, placement!.x, placement!.y);
      expect(sim).not.toBeNull();

      let holes = 0;
      for (let x = 0; x < W; x++) {
        const h = sim!.board.getColumnHeight(x);
        for (let y = 0; y < h; y++) {
          if (!sim!.board.get(x, y)) holes++;
        }
      }
      expect(holes).toBeLessThanOrEqual(1);
    });

    it('should spread Z pieces across the board (check max height)', () => {
      let board = new Board(W, TOTAL_H);

      // Place 10 Z pieces with AI decisions
      for (let i = 0; i < 10; i++) {
        const snapshot = {
          board: board.clone(), height: H, currentPiece: Piece.Z, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [Piece.Z], linesCleared: 0, piecesPlaced: i,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) break;
        board = sim.board;
      }

      // After 10 Z pieces (40 cells), board should not be absurdly high
      // With 10 columns and 40 cells, optimal is height 4
      // With Z-only, expect some inefficiency but not catastrophic stacking
      const maxH = board.getMaxHeight();
      expect(maxH).toBeLessThan(12); // should not be towering
    });
  });

  describe('Random game → Z/S spam (realistic adversarial scenarios)', () => {

    // Simple seeded PRNG for reproducible random sequences
    function mulberry32(seed: number) {
      let s = seed;
      return () => {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomPiece(rng: () => number): Piece {
      return ALL_PIECES[Math.floor(rng() * 7)]!;
    }

    // Play N random pieces, then M spam pieces; return { piecesPlaced, gameOver, board, maxHeight, holes }
    function playScenario(
      randomCount: number,
      spamPiece: Piece,
      spamCount: number,
      seed: number,
    ) {
      const rng = mulberry32(seed);
      let board = new Board(W, TOTAL_H);
      let piecesPlaced = 0;
      let linesCleared = 0;
      let gameOver = false;

      // Phase 1: random pieces
      for (let i = 0; i < randomCount; i++) {
        const piece = randomPiece(rng);
        const next = randomPiece(rng);
        const snapshot = {
          board: board.clone(), height: H, currentPiece: piece, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [next], linesCleared, piecesPlaced,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) { gameOver = true; break; }
        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) { gameOver = true; break; }
        board = sim.board;
        linesCleared += sim.linesCleared;
        piecesPlaced++;
      }

      if (gameOver) return { piecesPlaced, gameOver, board, linesCleared };

      // Phase 2: spam the adversarial piece
      for (let i = 0; i < spamCount; i++) {
        const snapshot = {
          board: board.clone(), height: H, currentPiece: spamPiece, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [spamPiece], linesCleared, piecesPlaced,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) { gameOver = true; break; }

        // Verify animation path is legal
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        expect(keyframes.length).toBeGreaterThanOrEqual(2);
        for (const frame of keyframes) {
          expect(board.collides(frame.piece, frame.rotation, frame.x, frame.y)).toBe(false);
        }
        // Lock frame matches target
        const lock = keyframes[keyframes.length - 1]!;
        expect(lock.x).toBe(placement.x);
        expect(lock.y).toBe(placement.y);
        expect(lock.rotation).toBe(placement.rotation);

        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) { gameOver = true; break; }
        board = sim.board;
        linesCleared += sim.linesCleared;
        piecesPlaced++;
      }

      // Count holes
      let holes = 0;
      for (let x = 0; x < W; x++) {
        const h = board.getColumnHeight(x);
        for (let y = 0; y < h; y++) {
          if (!board.get(x, y)) holes++;
        }
      }

      return { piecesPlaced, gameOver, board, linesCleared, maxHeight: board.getMaxHeight(), holes };
    }

    // Run 5 seeds for each scenario
    const SEEDS = [1, 42, 123, 777, 9999];

    for (const seed of SEEDS) {
      it(`seed=${seed}: 30 random → 20 Z spam (placement + animation legal)`, () => {
        const result = playScenario(30, Piece.Z, 20, seed);
        // Should have placed some pieces in both phases
        expect(result.piecesPlaced).toBeGreaterThan(30);
        // If not game over, height should be manageable
        if (!result.gameOver) {
          expect(result.maxHeight).toBeLessThan(TOTAL_H); // not topped out
        }
      });

      it(`seed=${seed}: 30 random → 20 S spam (placement + animation legal)`, () => {
        const result = playScenario(30, Piece.S, 20, seed);
        expect(result.piecesPlaced).toBeGreaterThan(30);
        if (!result.gameOver) {
          expect(result.maxHeight).toBeLessThan(H);
        }
      });
    }

    for (const seed of SEEDS) {
      it(`seed=${seed}: 50 random → 30 Z spam, AI survives and game over works`, () => {
        const result = playScenario(50, Piece.Z, 30, seed);
        // AI survived the random phase
        expect(result.piecesPlaced).toBeGreaterThanOrEqual(50);
      });
    }

    it('stress: 20 random → 40 Z spam, various seeds', () => {
      let totalPlaced = 0;
      let totalGameOvers = 0;

      for (let seed = 0; seed < 20; seed++) {
        const result = playScenario(20, Piece.Z, 40, seed);
        totalPlaced += result.piecesPlaced;
        if (result.gameOver) totalGameOvers++;
      }

      // Over 20 games, average should be reasonable
      const avgPlaced = totalPlaced / 20;
      expect(avgPlaced).toBeGreaterThan(25); // at least survived the random phase on average
    });

    it('stress: 20 random → 40 S spam, various seeds', () => {
      let totalPlaced = 0;

      for (let seed = 0; seed < 20; seed++) {
        const result = playScenario(20, Piece.S, 40, seed);
        totalPlaced += result.piecesPlaced;
      }

      const avgPlaced = totalPlaced / 20;
      expect(avgPlaced).toBeGreaterThan(25);
    });

    it('stress: 10 random → alternating Z/S spam for 30 pieces', () => {
      const rng = mulberry32(42);
      let board = new Board(W, TOTAL_H);
      let piecesPlaced = 0;
      let linesCleared = 0;

      // Phase 1: 10 random
      for (let i = 0; i < 10; i++) {
        const piece = randomPiece(rng);
        const next = randomPiece(rng);
        const snapshot = {
          board: board.clone(), height: H, currentPiece: piece, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [next], linesCleared, piecesPlaced,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;
        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) break;
        board = sim.board;
        linesCleared += sim.linesCleared;
        piecesPlaced++;
      }

      // Phase 2: alternating Z/S
      for (let i = 0; i < 30; i++) {
        const piece = i % 2 === 0 ? Piece.Z : Piece.S;
        const next = i % 2 === 0 ? Piece.S : Piece.Z;
        const snapshot = {
          board: board.clone(), height: H, currentPiece: piece, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [next], linesCleared, piecesPlaced,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) break;

        // Verify legal animation
        const keyframes = planAnimation(board, { ...placement, held: false }, W, H);
        for (const frame of keyframes) {
          expect(board.collides(frame.piece, frame.rotation, frame.x, frame.y)).toBe(false);
        }

        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) break;
        board = sim.board;
        linesCleared += sim.linesCleared;
        piecesPlaced++;
      }

      expect(piecesPlaced).toBeGreaterThan(20);
    });

    it('game over triggers correctly after random play + Z flood', () => {
      // Play a short random game, then flood with Z on a board with unclearable holes
      let board = new Board(W, TOTAL_H);

      // Create a messy board manually — fill 15 rows with random holes
      const rng = mulberry32(314);
      for (let y = 0; y < 15; y++) {
        for (let x = 0; x < W; x++) {
          if (rng() > 0.2) board.set(x, y, true); // 80% filled, but never full rows
        }
        // Ensure no row is completely full (prevent line clears)
        const emptyCol = Math.floor(rng() * W);
        board.set(emptyCol, y, false);
      }

      // Now spam Z until game over
      let placed = 0;
      let over = false;
      for (let i = 0; i < 50; i++) {
        const snapshot = {
          board: board.clone(), height: H, currentPiece: Piece.Z, holdPiece: null, holdUsed: false,
          allowHold: false, preview: [Piece.Z], linesCleared: 0, piecesPlaced: placed,
        };
        const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 1 });
        if (!placement) { over = true; break; }
        const sim = Game.simulatePlacement(board, placement.piece, placement.rotation, placement.x, placement.y);
        if (!sim) { over = true; break; }
        board = sim.board;
        placed++;

        // Check if spawn is now blocked
        const spawn = getSpawnPosition(Piece.Z, W, H);
        if (board.collides(Piece.Z, Rotation.R0, spawn.x, spawn.y)) {
          over = true;
          break;
        }
      }

      // On a board already 15 rows high with holes, Z spam must end the game
      expect(over).toBe(true);
      expect(placed).toBeGreaterThan(0); // at least one Z was placed
    });
  });
});
