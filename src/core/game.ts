import { Board } from './board.js';
import { getSpawnPosition, getSpawnPositionNRS, PIECE_CELLS } from './constants.js';
import { tryRotateNRS, NRS_SPAWN_ROTATION } from './nrs.js';
import { createRandomizer, type Randomizer } from './randomizer.js';
import type { TryRotateFn } from './rotation.js';
import { tryRotate } from './srs.js';
import {
  DEFAULT_CONFIG,
  Piece,
  Rotation,
  type GameConfig,
  type GameSnapshot,
  type LockResult,
  type Placement,
  type Vec2,
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

  // Pluggable rotation/spawn resolved from config.rotationSystem
  private readonly tryRotateFn: TryRotateFn;
  private readonly spawnPositionFn: (piece: Piece, width: number, height: number) => Vec2;
  private readonly spawnRotationFn: (piece: Piece) => Rotation;

  constructor(config?: Partial<GameConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const totalH = this.config.height + this.config.bufferRows;
    this.board = new Board(this.config.width, totalH);
    this.randomizer = createRandomizer(this.config.randomizer, this.config.seed);

    if (this.config.rotationSystem === 'nrs') {
      this.tryRotateFn = tryRotateNRS;
      this.spawnPositionFn = getSpawnPositionNRS;
      this.spawnRotationFn = (p: Piece) => NRS_SPAWN_ROTATION[p]!;
    } else {
      this.tryRotateFn = tryRotate;
      this.spawnPositionFn = getSpawnPosition;
      this.spawnRotationFn = () => Rotation.R0;
    }

    this.spawn();
  }

  /** Rotation function for this game's rotation system */
  get rotateFn(): TryRotateFn { return this.tryRotateFn; }
  /** Spawn position function for this game's rotation system */
  get spawnPosFn() { return this.spawnPositionFn; }
  /** Spawn rotation function for this game's rotation system */
  get spawnRotFn() { return this.spawnRotationFn; }

  private spawn(): boolean {
    this.currentPiece = this.randomizer.next();
    this.currentRotation = this.spawnRotationFn(this.currentPiece);
    const pos = this.spawnPositionFn(this.currentPiece, this.config.width, this.config.height);
    this.currentX = pos.x;
    this.currentY = pos.y;
    // Block out: can't spawn at all
    if (this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
      this.gameOver = true;
      return false;
    }
    // Guideline initial drop: drop 1 row if possible (before player gets control)
    if (this.config.initialDrop) {
      if (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY - 1)) {
        this.currentY--;
      }
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
    const result = this.tryRotateFn(
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
      this.currentRotation = this.spawnRotationFn(this.currentPiece);
      const pos = this.spawnPositionFn(this.currentPiece, this.config.width, this.config.height);
      this.currentX = pos.x;
      this.currentY = pos.y;
      if (this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
        this.gameOver = true;
        return false;
      }
      // Guideline initial drop after hold swap
      if (this.config.initialDrop) {
        if (!this.board.collides(this.currentPiece, this.currentRotation, this.currentX, this.currentY - 1)) {
          this.currentY--;
        }
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
    const visibleH = this.config.height;
    // NES truncation: discard cells above visible height
    const truncAbove = this.config.truncateLock ? visibleH : undefined;
    const placedCells = this.board.placePiece(
      this.currentPiece,
      this.currentRotation,
      this.currentX,
      this.currentY,
      truncAbove,
    );

    // Lock-out (Guideline/SRS only): game over if the ENTIRE piece locks above
    // the visible playfield. NES uses block-out only (checked in spawn).
    if (!this.config.truncateLock) {
      const allAbove = placedCells.every(cell => cell.y >= visibleH);
      if (allAbove) {
        this.gameOver = true;
        this.piecesPlaced++;
        return { linesCleared: 0, pieceCellsInCleared: 0, gameOver: true };
      }
    }

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
      height: this.config.height,
      rotationSystem: this.config.rotationSystem,
      initialDrop: this.config.initialDrop,
      truncateLock: this.config.truncateLock,
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
  // truncateAbove: NES truncation — cells at y >= truncateAbove are discarded.
  static simulatePlacement(
    board: Board,
    piece: Piece,
    rotation: Rotation,
    x: number,
    y: number,
    visibleHeight?: number,
    truncateAbove?: number,
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
      if (truncateAbove !== undefined && by >= truncateAbove) continue;
      b.set(bx, by, true);
      landingCells.push({ x: bx, y: by });
    }

    // If all cells were truncated, treat as invalid placement
    if (landingCells.length === 0) return null;

    // Lock-out (Guideline/SRS only): reject if ENTIRE piece above visible area.
    // NES uses block-out only (truncation handles the rest).
    if (visibleHeight !== undefined && truncateAbove === undefined) {
      const allAbove = landingCells.every(cell => cell.y >= visibleHeight);
      if (allAbove) return null;
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
