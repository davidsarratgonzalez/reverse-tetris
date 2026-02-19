import { describe, it, expect } from 'vitest';
import { Board } from '../../src/core/board.js';
import { generatePlacements } from '../../src/ai/placement.js';
import { tryRotateNRS, NRS_SPAWN_ROTATION } from '../../src/core/nrs.js';
import { getSpawnPositionNRS } from '../../src/core/constants.js';
import { tryRotate } from '../../src/core/srs.js';
import { Piece, Rotation } from '../../src/core/types.js';

describe('NRS placement generation', () => {
  it('should produce placements for T piece with both NRS and SRS', () => {
    // NRS board: 20 tall, no buffer (NRS spawns inside visible area)
    const nrsBoard = new Board(10, 20);
    const spawnNRS = getSpawnPositionNRS(Piece.T, 10, 20);
    const nrsPlacements = generatePlacements(
      nrsBoard, Piece.T, spawnNRS.x, spawnNRS.y,
      tryRotateNRS, NRS_SPAWN_ROTATION[Piece.T]!,
    );

    // SRS board: 40 tall (20 visible + 20 buffer)
    const srsBoard = new Board(10, 40);
    const srsPlacements = generatePlacements(
      srsBoard, Piece.T, 3, 18,
      tryRotate, Rotation.R0,
    );

    expect(nrsPlacements.length).toBeGreaterThan(0);
    expect(srsPlacements.length).toBeGreaterThan(0);
  });

  it('should only produce R1 and R2 rotations for S piece', () => {
    const board = new Board(10, 20);
    const spawn = getSpawnPositionNRS(Piece.S, 10, 20);
    const placements = generatePlacements(
      board, Piece.S, spawn.x, spawn.y,
      tryRotateNRS, NRS_SPAWN_ROTATION[Piece.S]!,
    );

    expect(placements.length).toBeGreaterThan(0);
    const rotations = new Set(placements.map(p => p.rotation));
    // S should only use R1 and R2 (toggle states)
    for (const rot of rotations) {
      expect(rot === Rotation.R1 || rot === Rotation.R2).toBe(true);
    }
  });

  it('should only produce R1 and R2 rotations for Z piece', () => {
    const board = new Board(10, 20);
    const spawn = getSpawnPositionNRS(Piece.Z, 10, 20);
    const placements = generatePlacements(
      board, Piece.Z, spawn.x, spawn.y,
      tryRotateNRS, NRS_SPAWN_ROTATION[Piece.Z]!,
    );

    expect(placements.length).toBeGreaterThan(0);
    const rotations = new Set(placements.map(p => p.rotation));
    for (const rot of rotations) {
      expect(rot === Rotation.R1 || rot === Rotation.R2).toBe(true);
    }
  });

  it('should only produce R0 and R1 rotations for I piece', () => {
    const board = new Board(10, 20);
    const spawn = getSpawnPositionNRS(Piece.I, 10, 20);
    const placements = generatePlacements(
      board, Piece.I, spawn.x, spawn.y,
      tryRotateNRS, NRS_SPAWN_ROTATION[Piece.I]!,
    );

    expect(placements.length).toBeGreaterThan(0);
    const rotations = new Set(placements.map(p => p.rotation));
    for (const rot of rotations) {
      expect(rot === Rotation.R0 || rot === Rotation.R1).toBe(true);
    }
  });

  it('should only produce R0 rotation for O piece', () => {
    const board = new Board(10, 20);
    const spawn = getSpawnPositionNRS(Piece.O, 10, 20);
    const placements = generatePlacements(
      board, Piece.O, spawn.x, spawn.y,
      tryRotateNRS, NRS_SPAWN_ROTATION[Piece.O]!,
    );

    expect(placements.length).toBeGreaterThan(0);
    const rotations = new Set(placements.map(p => p.rotation));
    expect(rotations.size).toBe(1);
    expect(rotations.has(Rotation.R0)).toBe(true);
  });

  it('should produce all 4 rotations for T/J/L pieces', () => {
    const board = new Board(10, 20);
    for (const piece of [Piece.T, Piece.J, Piece.L]) {
      const spawn = getSpawnPositionNRS(piece, 10, 20);
      const placements = generatePlacements(
        board, piece, spawn.x, spawn.y,
        tryRotateNRS, NRS_SPAWN_ROTATION[piece]!,
      );

      const rotations = new Set(placements.map(p => p.rotation));
      expect(rotations.size).toBe(4);
    }
  });
});
