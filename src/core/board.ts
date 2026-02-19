import { PIECE_CELLS } from './constants.js';
import { Piece, Rotation, type Vec2 } from './types.js';

export class Board {
  readonly width: number;
  readonly totalHeight: number; // visible + buffer

  // Row-major storage: cells[y * width + x], row 0 = bottom. 0=empty, 1=filled.
  private cells: Uint8Array;
  // Column heights: highest occupied row + 1 (0 means column is empty)
  private colHeights: Int32Array;

  constructor(width: number, totalHeight: number) {
    this.width = width;
    this.totalHeight = totalHeight;
    this.cells = new Uint8Array(width * totalHeight);
    this.colHeights = new Int32Array(width);
  }

  get(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.totalHeight) return false;
    return this.cells[y * this.width + x] === 1;
  }

  set(x: number, y: number, val: boolean): void {
    const idx = y * this.width + x;
    this.cells[idx] = val ? 1 : 0;
    if (val) {
      if (y + 1 > this.colHeights[x]!) {
        this.colHeights[x] = y + 1;
      }
    } else {
      // May need to recalculate height for this column
      if (y + 1 === this.colHeights[x]!) {
        let h = y;
        while (h > 0 && this.cells[(h - 1) * this.width + x] === 0) h--;
        this.colHeights[h > 0 ? x : x] = h;
        this.colHeights[x] = h;
      }
    }
  }

  getColumnHeight(col: number): number {
    return this.colHeights[col]!;
  }

  getMaxHeight(): number {
    let max = 0;
    for (let c = 0; c < this.width; c++) {
      if (this.colHeights[c]! > max) max = this.colHeights[c]!;
    }
    return max;
  }

  isRowFull(row: number): boolean {
    const base = row * this.width;
    for (let x = 0; x < this.width; x++) {
      if (this.cells[base + x] === 0) return false;
    }
    return true;
  }

  // Returns the number of lines cleared and an array of which rows were cleared.
  clearLines(): { count: number; rows: number[] } {
    const cleared: number[] = [];
    let writeRow = 0;
    for (let readRow = 0; readRow < this.totalHeight; readRow++) {
      if (this.isRowFull(readRow)) {
        cleared.push(readRow);
      } else {
        if (writeRow !== readRow) {
          // Copy row
          const src = readRow * this.width;
          const dst = writeRow * this.width;
          this.cells.copyWithin(dst, src, src + this.width);
        }
        writeRow++;
      }
    }
    // Clear remaining top rows
    for (let row = writeRow; row < this.totalHeight; row++) {
      const base = row * this.width;
      this.cells.fill(0, base, base + this.width);
    }
    // Rebuild column heights
    if (cleared.length > 0) {
      this.rebuildColumnHeights();
    }
    return { count: cleared.length, rows: cleared };
  }

  private rebuildColumnHeights(): void {
    for (let x = 0; x < this.width; x++) {
      let h = this.totalHeight;
      while (h > 0 && this.cells[(h - 1) * this.width + x] === 0) h--;
      this.colHeights[x] = h;
    }
  }

  // Check if placing a piece at (px, py) with given rotation collides.
  collides(piece: Piece, rotation: Rotation, px: number, py: number): boolean {
    const cells = PIECE_CELLS[piece]![rotation]!;
    for (const cell of cells) {
      const bx = px + cell.x;
      const by = py + cell.y;
      if (bx < 0 || bx >= this.width || by < 0 || by >= this.totalHeight) return true;
      if (this.cells[by * this.width + bx] === 1) return true;
    }
    return false;
  }

  // Place piece cells onto the board. Returns the absolute cell positions placed.
  // If truncateAbove is set, cells at y >= truncateAbove are discarded (NES behavior).
  placePiece(piece: Piece, rotation: Rotation, px: number, py: number, truncateAbove?: number): Vec2[] {
    const cells = PIECE_CELLS[piece]![rotation]!;
    const placed: Vec2[] = [];
    for (const cell of cells) {
      const bx = px + cell.x;
      const by = py + cell.y;
      if (truncateAbove !== undefined && by >= truncateAbove) continue;
      this.set(bx, by, true);
      placed.push({ x: bx, y: by });
    }
    return placed;
  }

  clone(): Board {
    const b = new Board(this.width, this.totalHeight);
    b.cells.set(this.cells);
    b.colHeights.set(this.colHeights);
    return b;
  }

  // Simple hash for deduplication in beam search
  hash(): bigint {
    let h = 0n;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === 1) {
        h ^= BigInt(i) * 2654435761n; // Knuth multiplicative hash
        h = (h << 1n) | (h >> 63n); // rotate
      }
    }
    return h;
  }

  // For debugging: render board as string
  toString(visibleHeight?: number): string {
    const h = visibleHeight ?? this.totalHeight;
    const lines: string[] = [];
    for (let y = h - 1; y >= 0; y--) {
      let row = '|';
      for (let x = 0; x < this.width; x++) {
        row += this.cells[y * this.width + x] === 1 ? '[]' : '  ';
      }
      row += '|';
      lines.push(row);
    }
    lines.push('+' + '--'.repeat(this.width) + '+');
    return lines.join('\n');
  }
}
