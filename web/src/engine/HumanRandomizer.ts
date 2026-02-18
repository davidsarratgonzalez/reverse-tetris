import { Piece } from '@core/types';
import type { Randomizer } from '@core/randomizer';

export class HumanRandomizer implements Randomizer {
  readonly seed = 0;
  private queue: Piece[] = [];

  enqueue(piece: Piece): void {
    this.queue.push(piece);
  }

  canAdvance(): boolean {
    return this.queue.length > 0;
  }

  queueLength(): number {
    return this.queue.length;
  }

  peekQueue(): Piece[] {
    return [...this.queue];
  }

  next(): Piece {
    const p = this.queue.shift();
    if (p === undefined) throw new Error('HumanRandomizer: queue empty — game should have waited for player');
    return p;
  }

  peek(count: number): Piece[] {
    return this.queue.slice(0, count);
  }

  clone(): HumanRandomizer {
    const r = new HumanRandomizer();
    r.queue = [...this.queue];
    return r;
  }
}
