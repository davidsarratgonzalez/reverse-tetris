import { Board } from './board.js';
import { getSpawnPosition, PIECE_CELLS } from './constants.js';
import { createRandomizer, type Randomizer } from './randomizer.js';
import { tryRotate } from './srs.js';
import {
  DEFAULT_CONFIG,
  Piece,
  Rotation,
  type GameConfig,
  type GameSnapshot,
  type LockResult,
  type Placement,
} from './types.js';

export class Game {
  readonly config: GameConfig;
  board: Board;
  currentPiece!: Piece;
  currentRotation!: Rotation;
  currentX!: number;
  currentY!: number;
  holdPiece: Piece | null = null;
  holdUsed = false;
  linesCleared = 0;
  piecesPlaced = 0;
  gameOver = false;
  randomizer: Randomizer;

  constructor(config?: Partial<GameConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const totalH = this.config.height + this.config.bufferRows;
    this.board = new Board(this.config.width, totalH);
    this.randomizer = createRandomizer(this.config.randomizer, this.config.seed);
    this.spawn();
  }

  private spawn(): boolean {
    this.currentPiece = this.randomizer.next();
    this.currentRotation = Rotation.R0;
    const pos = getSpawnPosition(this.currentPiece, this.config.width, this.config.height);
    this.currentX = pos.x;
    this.currentY = pos.y;
    if (this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
      this.gameOver = true;
      return false;
    }
    return true;
  }

  moveLeft(): boolean {
    if (this.gameOver) return false;
    if (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX - 1, this.currentY)) {
      this.currentX--;
      return true;
    }
    return false;
  }

  moveRight(): boolean {
    if (this.gameOver) return false;
    if (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX + 1, this.currentY)) {
      this.currentX++;
      return true;
    }
    return false;
  }

  moveDown(): boolean {
    if (this.gameOver) return false;
    if (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY - 1)) {
      this.currentY--;
      return true;
    }
    return false;
  }

  rotate(direction: 1 | -1): boolean {
    if (this.gameOver) return false;
    const result = tryRotate(
      this.board,
      this.currentPiece,
      this.currentRotation,
      direction,
      this.currentX,
      this.currentY,
    );
    if (result) {
      this.currentX = result.x;
      this.currentY = result.y;
      this.currentRotation = result.rotation;
      return true;
    }
    return false;
  }

  hold(): boolean {
    if (this.gameOver || this.holdUsed || !this.config.allowHold) return false;
    this.holdUsed = true;
    if (this.holdPiece === null) {
      this.holdPiece = this.currentPiece;
      this.spawn();
    } else {
      const tmp = this.holdPiece;
      this.holdPiece = this.currentPiece;
      this.currentPiece = tmp;
      this.currentRotation = Rotation.R0;
      const pos = getSpawnPosition(this.currentPiece, this.config.width, this.config.height);
      this.currentX = pos.x;
      this.currentY = pos.y;
      if (this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
        this.gameOver = true;
        return false;
      }
    }
    return true;
  }

  hardDrop(): LockResult {
    if (this.gameOver) return { linesCleared: 0, pieceCellsInCleared: 0, gameOver: true };
    // Drop to lowest valid position
    while (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY - 1)) {
      this.currentY--;
    }
    return this.lock();
  }

  private lock(): LockResult {
    const placedCells = this.board.placePiece(
      this.currentPiece,
      this.currentRotation,
      this.currentX,
      this.currentY,
    );
    const { count, rows } = this.board.clearLines();

    // Count how many piece cells were in cleared rows
    let pieceCellsInCleared = 0;
    if (count > 0) {
      const clearedSet = new Set(rows);
      for (const cell of placedCells) {
        if (clearedSet.has(cell.y)) pieceCellsInCleared++;
      }
    }

    this.linesCleared += count;
    this.piecesPlaced++;
    this.holdUsed = false;

    // Spawn next piece
    this.spawn();

    return { linesCleared: count, pieceCellsInCleared, gameOver: this.gameOver };
  }

  getPreview(): Piece[] {
    return this.randomizer.peek(this.config.previewCount);
  }

  snapshot(): GameSnapshot {
    return {
      board: this.board.clone(),
      currentPiece: this.currentPiece,
      holdPiece: this.holdPiece,
      holdUsed: this.holdUsed,
      allowHold: this.config.allowHold,
      preview: this.getPreview(),
      linesCleared: this.linesCleared,
      piecesPlaced: this.piecesPlaced,
    };
  }

  // Apply a placement directly (used by AI). Teleports piece to target position and locks.
  applyPlacement(placement: Placement): LockResult {
    if (this.gameOver) return { linesCleared: 0, pieceCellsInCleared: 0, gameOver: true };

    if (placement.held) {
      if (!this.hold()) {
        return { linesCleared: 0, pieceCellsInCleared: 0, gameOver: this.gameOver };
      }
    }

    this.currentRotation = placement.rotation;
    this.currentX = placement.x;
    this.currentY = placement.y;

    // Verify the placement is valid (not colliding)
    if (this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
      this.gameOver = true;
      return { linesCleared: 0, pieceCellsInCleared: 0, gameOver: true };
    }

    return this.lock();
  }

  // Simulate placing a piece on a board clone. Returns features needed for evaluation.
  static simulatePlacement(
    board: Board,
    piece: Piece,
    rotation: Rotation,
    x: number,
    y: number,
  ): {
    board: Board;
    linesCleared: number;
    pieceCellsInCleared: number;
    landingCells: { x: number; y: number }[];
  } | null {
    const b = board.clone();
    if (b.collides(piece, rotation, x, y)) return null;

    const cells = PIECE_CELLS[piece]![rotation]!;
    const landingCells: { x: number; y: number }[] = [];
    for (const cell of cells) {
      const bx = x + cell.x;
      const by = y + cell.y;
      b.set(bx, by, true);
      landingCells.push({ x: bx, y: by });
    }

    const { count, rows } = b.clearLines();
    let pieceCellsInCleared = 0;
    if (count > 0) {
      const clearedSet = new Set(rows);
      for (const cell of landingCells) {
        if (clearedSet.has(cell.y)) pieceCellsInCleared++;
      }
    }

    return { board: b, linesCleared: count, pieceCellsInCleared, landingCells };
  }
}
