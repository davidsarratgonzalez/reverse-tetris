import { Piece } from '@core/types';
import type { Board } from '@core/board';
import { PIECE_CELLS } from '@core/constants';

/**
 * Parallel color storage that tracks which piece type occupies each cell.
 * The engine's Board only stores binary (filled/empty), but we need
 * piece identity for NES-style coloring.
 */
export class ColorBoard {
  readonly width: number;
  readonly totalHeight: number;
  private colors: (Piece | null)[];

  constructor(width: number, totalHeight: number) {
    this.width = width;
    this.totalHeight = totalHeight;
    this.colors = new Array(width * totalHeight).fill(null);
  }

  get(x: number, y: number): Piece | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.totalHeight) return null;
    return this.colors[y * this.width + x] ?? null;
  }

  placePiece(
    piece: Piece,
    rotation: number,
    px: number,
    py: number,
  ): void {
    const cells = PIECE_CELLS[piece]![rotation]!;
    for (const cell of cells) {
      const bx = px + cell.x;
      const by = py + cell.y;
      if (bx >= 0 && bx < this.width && by >= 0 && by < this.totalHeight) {
        this.colors[by * this.width + bx] = piece;
      }
    }
  }

  clearLines(rows: number[]): void {
    if (rows.length === 0) return;
    const clearedSet = new Set(rows);
    const newColors: (Piece | null)[] = [];

    for (let y = 0; y < this.totalHeight; y++) {
      if (!clearedSet.has(y)) {
        for (let x = 0; x < this.width; x++) {
          newColors.push(this.colors[y * this.width + x] ?? null);
        }
      }
    }

    // Fill remaining top rows with null
    while (newColors.length < this.width * this.totalHeight) {
      newColors.push(null);
    }

    this.colors = newColors;
  }

  /**
   * Sync from engine board — used after applyPlacement to handle
   * any discrepancies. If a cell is empty in the engine board, clear it here.
   */
  syncWithBoard(board: Board): void {
    for (let y = 0; y < this.totalHeight; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!board.get(x, y)) {
          this.colors[y * this.width + x] = null;
        }
      }
    }
  }

  clone(): ColorBoard {
    const cb = new ColorBoard(this.width, this.totalHeight);
    cb.colors = [...this.colors];
    return cb;
  }
}
