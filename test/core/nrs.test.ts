import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { tryRotateNRS, NRS_SPAWN_ROTATION } from '../../src/core/nrs.js';
import { Piece, Rotation } from '../../src/core/types.js';

describe('NRS rotation', () => {
  it('should have correct spawn rotations per piece', () => {
    expect(NRS_SPAWN_ROTATION[Piece.I]).toBe(Rotation.R0);
    expect(NRS_SPAWN_ROTATION[Piece.O]).toBe(Rotation.R0);
    expect(NRS_SPAWN_ROTATION[Piece.T]).toBe(Rotation.R2);
    expect(NRS_SPAWN_ROTATION[Piece.S]).toBe(Rotation.R2);
    expect(NRS_SPAWN_ROTATION[Piece.Z]).toBe(Rotation.R2);
    expect(NRS_SPAWN_ROTATION[Piece.J]).toBe(Rotation.R2);
    expect(NRS_SPAWN_ROTATION[Piece.L]).toBe(Rotation.R2);
  });

  it('should not rotate O piece', () => {
    const board = new Board(10, 20);
    const result = tryRotateNRS(board, Piece.O, Rotation.R0, 1, 4, 4);
    expect(result).toBeNull();
  });

  it('should toggle S piece between R1 and R2', () => {
    const board = new Board(10, 20);
    // S spawns at R2, rotate CW → R1
    const r1 = tryRotateNRS(board, Piece.S, Rotation.R2, 1, 4, 4);
    expect(r1).not.toBeNull();
    expect(r1!.rotation).toBe(Rotation.R1);

    // From R1, rotate CW → R2
    const r2 = tryRotateNRS(board, Piece.S, Rotation.R1, 1, 4, 4);
    expect(r2).not.toBeNull();
    expect(r2!.rotation).toBe(Rotation.R2);

    // From R2, rotate CCW → R1
    const r1b = tryRotateNRS(board, Piece.S, Rotation.R2, -1, 4, 4);
    expect(r1b).not.toBeNull();
    expect(r1b!.rotation).toBe(Rotation.R1);
  });

  it('should toggle Z piece between R1 and R2', () => {
    const board = new Board(10, 20);
    const r1 = tryRotateNRS(board, Piece.Z, Rotation.R2, 1, 4, 4);
    expect(r1).not.toBeNull();
    expect(r1!.rotation).toBe(Rotation.R1);

    const r2 = tryRotateNRS(board, Piece.Z, Rotation.R1, -1, 4, 4);
    expect(r2).not.toBeNull();
    expect(r2!.rotation).toBe(Rotation.R2);
  });

  it('should toggle I piece between R0 and R1', () => {
    const board = new Board(10, 20);
    const r1 = tryRotateNRS(board, Piece.I, Rotation.R0, 1, 3, 5);
    expect(r1).not.toBeNull();
    expect(r1!.rotation).toBe(Rotation.R1);

    const r0 = tryRotateNRS(board, Piece.I, Rotation.R1, 1, 3, 5);
    expect(r0).not.toBeNull();
    expect(r0!.rotation).toBe(Rotation.R0);
  });

  it('should cycle T/J/L through 4 rotation states', () => {
    const board = new Board(10, 20);
    for (const piece of [Piece.T, Piece.J, Piece.L]) {
      let rot = Rotation.R0;
      for (let i = 0; i < 4; i++) {
        const result = tryRotateNRS(board, piece, rot, 1, 4, 10);
        expect(result).not.toBeNull();
        rot = result!.rotation;
      }
      expect(rot).toBe(Rotation.R0);
    }
  });

  it('should NOT wall kick (fails on collision)', () => {
    const board = new Board(10, 20);
    // Fill rows 0-3 completely to block rotation
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 10; x++) {
        board.set(x, y, true);
      }
    }
    // T at (4, 4) in R0 — rotating CW would go to R1
    // With walls blocking, SRS would kick but NRS should fail
    // Clear just enough that the piece fits at current position
    board.set(3, 4, false);
    board.set(4, 4, false);
    board.set(5, 4, false);
    board.set(4, 5, false);

    // Block the R1 rotated position
    board.set(5, 5, true);
    board.set(5, 3, true);
    const result = tryRotateNRS(board, Piece.T, Rotation.R0, 1, 3, 4);
    expect(result).toBeNull();
  });

  it('should not change x/y position on successful rotation', () => {
    const board = new Board(10, 20);
    const result = tryRotateNRS(board, Piece.T, Rotation.R0, 1, 4, 10);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(4);
    expect(result!.y).toBe(10);
  });
});
