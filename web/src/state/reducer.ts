import { Piece, Rotation } from '@core/types';
import { getSpawnPosition } from '@core/constants';
import { Game } from '@core/game';
import { HumanRandomizer } from '@web/engine/HumanRandomizer';
import { ColorBoard } from '@web/engine/ColorBoard';
import { initialScore, applyLineClears } from '@web/engine/scoring';
import { getGhostY } from '@web/engine/AnimationPlanner';
import { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ROWS, VISIBLE_BUFFER } from '@web/utils/constants';
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
  const totalRender = BOARD_HEIGHT + VISIBLE_BUFFER;
  return {
    phase: 'START_SCREEN',
    boardCells: new Array(BOARD_WIDTH * totalRender).fill(null),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    activePiece: null,
    ghostY: null,
    currentPiece: null,
    preview: [],
    scoreState: initialScore(),
    piecesPlaced: 0,
    clearingLines: null,
    collapseShifts: null,
    gameOver: false,
  };
}

export function extractBoardCells(colorBoard: ColorBoard): (Piece | null)[] {
  const cells: (Piece | null)[] = [];
  const totalRender = BOARD_HEIGHT + VISIBLE_BUFFER;
  for (let y = 0; y < totalRender; y++) {
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

  const hideActive = phase === 'BOT_THINKING' || phase === 'WAITING_FOR_PLAYER'
    || phase === 'GAME_OVER' || phase === 'LINE_CLEARING';
  const activePiece = hideActive
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
    collapseShifts: null,
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

  // Apply in engine (clears lines internally)
  let result;
  try {
    result = game.applyPlacement(placement);
  } catch {
    // HumanRandomizer empty or engine error → treat as game over
    game.gameOver = true;
    return getViewFromEngine(refs, 'GAME_OVER', currentScore, currentPiecesPlaced, null);
  }

  if (result.gameOver) {
    return getViewFromEngine(refs, 'GAME_OVER', currentScore, currentPiecesPlaced, null);
  }

  const newPiecesPlaced = currentPiecesPlaced + 1;

  if (result.linesCleared > 0) {
    const newScore = applyLineClears(currentScore, result.linesCleared);

    // Detect full rows BEFORE clearing the colorBoard
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

    // Snapshot the pre-clear board for the flash animation
    const preClearCells = extractBoardCells(colorBoard);

    // Now collapse the colorBoard to match the engine
    colorBoard.clearLines(fullRows);
    colorBoard.syncWithBoard(game.board);

    // Return view with PRE-clear cells so the flash highlights the right rows
    const view = getViewFromEngine(refs, 'LINE_CLEARING', newScore, newPiecesPlaced, fullRows);
    view.boardCells = preClearCells;
    return view;
  }

  colorBoard.syncWithBoard(game.board);
  return getViewFromEngine(refs, 'WAITING_FOR_PLAYER', currentScore, newPiecesPlaced, null);
}

/**
 * Compute per-row collapse shifts: for each post-clear row,
 * how many rows it needs to "fall" visually.
 */
export function computeCollapseShifts(
  clearedRows: number[],
  boardHeight: number,
): number[] {
  const clearedSet = new Set(clearedRows);
  const shifts: number[] = new Array(boardHeight).fill(0);
  let writeRow = 0;
  for (let readRow = 0; readRow < boardHeight; readRow++) {
    if (clearedSet.has(readRow)) continue;
    shifts[writeRow] = readRow - writeRow;
    writeRow++;
  }
  return shifts;
}
