import { describe, it, expect } from 'vitest';
import { BagRandomizer, UniformRandomizer } from '../../src/core/randomizer.js';
import { Piece, PIECE_COUNT } from '../../src/core/types.js';

describe('UniformRandomizer', () => {
  it('should be deterministic with same seed', () => {
    const r1 = new UniformRandomizer(42);
    const r2 = new UniformRandomizer(42);
    for (let i = 0; i < 100; i++) {
      expect(r1.next()).toBe(r2.next());
    }
  });

  it('should produce valid piece types', () => {
    const r = new UniformRandomizer(123);
    for (let i = 0; i < 100; i++) {
      const p = r.next();
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(PIECE_COUNT);
    }
  });

  it('should peek without consuming', () => {
    const r = new UniformRandomizer(42);
    const peeked = r.peek(5);
    expect(peeked.length).toBe(5);
    // next() should return the same as the first peeked value
    expect(r.next()).toBe(peeked[0]);
  });
});

describe('BagRandomizer', () => {
  it('should be deterministic with same seed', () => {
    const r1 = new BagRandomizer(42);
    const r2 = new BagRandomizer(42);
    for (let i = 0; i < 100; i++) {
      expect(r1.next()).toBe(r2.next());
    }
  });

  it('should produce each piece exactly once per bag of 7', () => {
    const r = new BagRandomizer(42);
    for (let bag = 0; bag < 10; bag++) {
      const seen = new Set<Piece>();
      for (let i = 0; i < PIECE_COUNT; i++) {
        seen.add(r.next());
      }
      expect(seen.size).toBe(PIECE_COUNT);
    }
  });

  it('should peek without consuming', () => {
    const r = new BagRandomizer(42);
    const peeked = r.peek(14); // 2 bags
    expect(peeked.length).toBe(14);
    for (let i = 0; i < 14; i++) {
      expect(r.next()).toBe(peeked[i]);
    }
  });

  it('should clone independently', () => {
    const r = new BagRandomizer(42);
    // Consume some pieces
    for (let i = 0; i < 5; i++) r.next();
    const clone = r.clone();
    // Both should produce the same subsequent pieces
    const original: Piece[] = [];
    const cloned: Piece[] = [];
    for (let i = 0; i < 20; i++) {
      original.push(r.next());
      cloned.push(clone.next());
    }
    expect(original).toEqual(cloned);
  });
});
