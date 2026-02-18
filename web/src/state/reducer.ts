import { Piece, Rotation } from '@core/types';
import { getSpawnPosition } from '@core/constants';
import { Game } from '@core/game';
import { HumanRandomizer } from '@web/engine/HumanRandomizer';
import { ColorBoard } from '@web/engine/ColorBoard';
import { initialScore, applyLineClears } from '@web/engine/scoring';
import { getGhostY } from '@web/engine/AnimationPlanner';
import { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ROWS } from '@web/utils/constants';
import type { ViewState, GamePhase } from './types';
import type { Placement } from '@core/types';
import type { AnimationKeyframe } from '@web/engine/AnimationPlanner';

/** Mutable engine objects — not part of React state */
export interface EngineRefs {
  game: Game | null;
  randomizer: HumanRandomizer | null;
  colorBoard: ColorBoard | null;
}

export function createEngineRefs(): EngineRefs {
  return { game: null, randomizer: null, colorBoard: null };
}

export function createInitialView(): ViewState {
  return {
    phase: 'START_SCREEN',
    boardCells: new Array(BOARD_WIDTH * BOARD_HEIGHT).fill(null),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    activePiece: null,
    ghostY: null,
    currentPiece: null,
    preview: [],
    scoreState: initialScore(),
    piecesPlaced: 0,
    clearingLines: null,
    gameOver: false,
  };
}

function extractBoardCells(colorBoard: ColorBoard): (Piece | null)[] {
  const cells: (Piece | null)[] = [];
  // Only visible rows (0 to BOARD_HEIGHT-1), row 0 = bottom
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      cells.push(colorBoard.get(x, y));
    }
  }
  return cells;
}

function getViewFromEngine(
  refs: EngineRefs,
  phase: GamePhase,
  scoreState: ViewState['scoreState'],
  piecesPlaced: number,
  clearingLines: number[] | null,
): ViewState {
  const { game, colorBoard } = refs;
  if (!game || !colorBoard) return { ...createInitialView(), phase };

  const activePiece = phase === 'BOT_THINKING' || phase === 'WAITING_FOR_PLAYER'
    ? null
    : {
        piece: game.currentPiece,
        rotation: game.currentRotation,
        x: game.currentX,
        y: game.currentY,
      };

  const ghostY = activePiece
    ? getGhostY(game.board, activePiece.piece, activePiece.rotation, activePiece.x, activePiece.y)
    : null;

  return {
    phase,
    boardCells: extractBoardCells(colorBoard),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    activePiece,
    ghostY,
    currentPiece: game.currentPiece,
    preview: game.getPreview(),
    scoreState,
    piecesPlaced,
    clearingLines,
    gameOver: game.gameOver,
  };
}

// --- Actions ---

export function startGame(refs: EngineRefs): ViewState {
  refs.game = null;
  refs.randomizer = new HumanRandomizer();
  refs.colorBoard = null;
  return {
    ...createInitialView(),
    phase: 'PICKING_FIRST',
  };
}

export function pickFirstPiece(refs: EngineRefs, piece: Piece): ViewState {
  refs.randomizer!.enqueue(piece);
  return {
    ...createInitialView(),
    phase: 'PICKING_SECOND',
  };
}

export function pickSecondPiece(
  refs: EngineRefs,
  piece: Piece,
): ViewState {
  const randomizer = refs.randomizer!;
  randomizer.enqueue(piece);

  // Create game — constructor will use default randomizer + spawn()
  const game = new Game({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    bufferRows: BUFFER_ROWS,
    previewCount: 1,
    allowHold: false,
    seed: 0,
  });

  // Override with human randomizer
  game.randomizer = randomizer;

  // Reset current piece from human randomizer
  const firstPiece = randomizer.next();
  game.currentPiece = firstPiece;
  game.currentRotation = Rotation.R0;
  const spawn = getSpawnPosition(firstPiece, BOARD_WIDTH, BOARD_HEIGHT);
  game.currentX = spawn.x;
  game.currentY = spawn.y;
  game.gameOver = false;

  const colorBoard = new ColorBoard(BOARD_WIDTH, BOARD_HEIGHT + BUFFER_ROWS);

  refs.game = game;
  refs.colorBoard = colorBoard;

  return getViewFromEngine(refs, 'BOT_THINKING', initialScore(), 0, null);
}

export function pickNextPiece(
  refs: EngineRefs,
  piece: Piece,
  currentScore: ViewState['scoreState'],
  currentPiecesPlaced: number,
): ViewState {
  refs.randomizer!.enqueue(piece);
  return getViewFromEngine(refs, 'BOT_THINKING', currentScore, currentPiecesPlaced, null);
}

export function applyAnimationFrame(
  refs: EngineRefs,
  frame: AnimationKeyframe,
  currentScore: ViewState['scoreState'],
  currentPiecesPlaced: number,
): ViewState {
  return {
    ...getViewFromEngine(refs, 'BOT_ANIMATING', currentScore, currentPiecesPlaced, null),
    activePiece: {
      piece: frame.piece,
      rotation: frame.rotation,
      x: frame.x,
      y: frame.y,
    },
    ghostY: getGhostY(refs.game!.board, frame.piece, frame.rotation, frame.x, frame.y),
  };
}

export function applyPlacement(
  refs: EngineRefs,
  placement: Placement,
  currentScore: ViewState['scoreState'],
  currentPiecesPlaced: number,
): ViewState {
  const { game, colorBoard } = refs;
  if (!game || !colorBoard) return createInitialView();

  // Place on color board
  colorBoard.placePiece(placement.piece, placement.rotation, placement.x, placement.y);

  // Apply in engine
  const result = game.applyPlacement(placement);

  if (result.gameOver) {
    return getViewFromEngine(refs, 'GAME_OVER', currentScore, currentPiecesPlaced, null);
  }

  let newScore = currentScore;
  let clearingLines: number[] | null = null;

  if (result.linesCleared > 0) {
    // Find cleared rows from colorBoard before sync
    // After engine clears, colorBoard is stale. We identify full rows pre-clear
    // by checking the colorBoard for rows that are entirely non-null
    // Actually, engine already cleared. We need to rebuild.
    // Simpler: just figure out which rows were cleared based on the placement
    // and rebuild colorBoard from the engine board.
    newScore = applyLineClears(currentScore, result.linesCleared);

    // Identify cleared row indices for flash effect
    // Since we placed the piece on colorBoard but haven't cleared it yet,
    // we can detect full rows
    const fullRows: number[] = [];
    for (let y = 0; y < BOARD_HEIGHT + BUFFER_ROWS; y++) {
      let full = true;
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (colorBoard.get(x, y) === null) {
          full = false;
          break;
        }
      }
      if (full) fullRows.push(y);
    }
    clearingLines = fullRows;

    // Now sync colorBoard
    colorBoard.clearLines(fullRows);
    colorBoard.syncWithBoard(game.board);
  } else {
    colorBoard.syncWithBoard(game.board);
  }

  const newPiecesPlaced = currentPiecesPlaced + 1;
  const nextPhase: GamePhase = result.gameOver ? 'GAME_OVER' : 'WAITING_FOR_PLAYER';

  return getViewFromEngine(refs, nextPhase, newScore, newPiecesPlaced, clearingLines);
}
