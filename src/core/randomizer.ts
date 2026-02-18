import { Piece, PIECE_COUNT } from './types.js';

// mulberry32: fast, deterministic 32-bit PRNG with capturable state
class Prng {
  state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  clone(): Prng {
    const p = new Prng(0);
    p.state = this.state;
    return p;
  }
}

export interface Randomizer {
  next(): Piece;
  peek(count: number): Piece[];
  clone(): Randomizer;
  readonly seed: number;
}

export class UniformRandomizer implements Randomizer {
  readonly seed: number;
  private rng: Prng;
  private buffer: Piece[] = [];

  constructor(seed: number) {
    this.seed = seed;
    this.rng = new Prng(seed);
  }

  private generate(): Piece {
    return Math.floor(this.rng.next() * PIECE_COUNT) as Piece;
  }

  private ensureBuffer(count: number): void {
    while (this.buffer.length < count) {
      this.buffer.push(this.generate());
    }
  }

  next(): Piece {
    this.ensureBuffer(1);
    return this.buffer.shift()!;
  }

  peek(count: number): Piece[] {
    this.ensureBuffer(count);
    return this.buffer.slice(0, count);
  }

  clone(): UniformRandomizer {
    const r = new UniformRandomizer(this.seed);
    r.rng = this.rng.clone();
    r.buffer = [...this.buffer];
    return r;
  }
}

export class BagRandomizer implements Randomizer {
  readonly seed: number;
  private rng: Prng;
  private buffer: Piece[] = [];

  constructor(seed: number) {
    this.seed = seed;
    this.rng = new Prng(seed);
  }

  private generateBag(): Piece[] {
    const bag: Piece[] = [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L];
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [bag[i], bag[j]] = [bag[j]!, bag[i]!];
    }
    return bag;
  }

  private ensureBuffer(count: number): void {
    while (this.buffer.length < count) {
      this.buffer.push(...this.generateBag());
    }
  }

  next(): Piece {
    this.ensureBuffer(1);
    return this.buffer.shift()!;
  }

  peek(count: number): Piece[] {
    this.ensureBuffer(count);
    return this.buffer.slice(0, count);
  }

  clone(): BagRandomizer {
    const r = new BagRandomizer(this.seed);
    r.rng = this.rng.clone();
    r.buffer = [...this.buffer];
    return r;
  }
}

export function createRandomizer(type: 'uniform' | 'bag7', seed: number): Randomizer {
  return type === 'bag7' ? new BagRandomizer(seed) : new UniformRandomizer(seed);
}
