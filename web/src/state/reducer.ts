import { Piece, Rotation } from '@core/types';
import { Game } from '@core/game';
import type { ModeConfig } from '@core/mode';
import { HumanRandomizer } from '@web/engine/HumanRandomizer';
import { ColorBoard } from '@web/engine/ColorBoard';
import { initialScore, applyLineClears } from '@web/engine/scoring';
import { getGhostY } from '@web/engine/AnimationPlanner';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@web/utils/constants';
import type { ViewState, GamePhase } from './types';
import type { Placement } from '@core/types';
import type { AnimationKeyframe } from '@web/engine/AnimationPlanner';

/** Mutable engine objects — not part of React state */
export interface EngineRefs {
  game: Game | null;
  randomizer: HumanRandomizer | null;
  colorBoard: ColorBoard | null;
  modeConfig: ModeConfig | null;
}

export function createEngineRefs(): EngineRefs {
  return { game: null, randomizer: null, colorBoard: null, modeConfig: null };
}

export function createInitialView(modeConfig?: ModeConfig): ViewState {
  const visibleBuffer = modeConfig?.visibleBuffer ?? 0;
  const totalRender = BOARD_HEIGHT + visibleBuffer;
  return {
    phase: 'START_SCREEN',
    mode: modeConfig?.mode ?? null,
    boardCells: new Array(BOARD_WIDTH * totalRender).fill(null),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    picksRemaining: 0,
    pickedPieces: [],
    activePiece: null,
    ghostY: null,
    showGhost: modeConfig?.showGhost ?? false,
    visibleBuffer,
    currentPiece: null,
    preview: [],
    holdPiece: null,
    scoreState: initialScore(),
    piecesPlaced: 0,
    clearingLines: null,
    collapseShifts: null,
    activeInput: null,
    gameOver: false,
  };
}

export function extractBoardCells(colorBoard: ColorBoard, visibleBuffer: number): (Piece | null)[] {
  const cells: (Piece | null)[] = [];
  const totalRender = BOARD_HEIGHT + visibleBuffer;
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
  const { game, colorBoard, modeConfig } = refs;
  const visibleBuffer = modeConfig?.visibleBuffer ?? 0;
  const showGhost = modeConfig?.showGhost ?? false;
  if (!game || !colorBoard) return { ...createInitialView(modeConfig ?? undefined), phase };

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

  const ghostY = (activePiece && showGhost)
    ? getGhostY(game.board, activePiece.piece, activePiece.rotation, activePiece.x, activePiece.y)
    : null;

  return {
    phase,
    mode: modeConfig?.mode ?? null,
    boardCells: extractBoardCells(colorBoard, visibleBuffer),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    picksRemaining: 0,
    pickedPieces: [],
    activePiece,
    ghostY,
    showGhost,
    visibleBuffer,
    currentPiece: game.currentPiece,
    preview: game.getPreview(),
    holdPiece: game.holdPiece,
    scoreState,
    piecesPlaced,
    clearingLines,
    collapseShifts: null,
    activeInput: null,
    gameOver: game.gameOver,
  };
}

// --- Actions ---

export function startGame(refs: EngineRefs, modeConfig: ModeConfig): ViewState {
  refs.game = null;
  refs.randomizer = new HumanRandomizer();
  refs.colorBoard = null;
  refs.modeConfig = modeConfig;
  return {
    ...createInitialView(modeConfig),
    phase: 'PICKING',
    picksRemaining: modeConfig.initialPicks,
  };
}

export function pickPiece(
  refs: EngineRefs,
  piece: Piece,
  currentView: ViewState,
): ViewState {
  const { randomizer, modeConfig } = refs;
  if (!randomizer || !modeConfig) return currentView;

  randomizer.enqueue(piece);
  const remaining = currentView.picksRemaining - 1;
  const pickedPieces = [...currentView.pickedPieces, piece];

  if (remaining > 0) {
    return {
      ...currentView,
      picksRemaining: remaining,
      pickedPieces,
    };
  }

  // All picks done — create the game
  const bufferRows = modeConfig.gameConfig.bufferRows ?? 20;
  const game = new Game({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    bufferRows,
    previewCount: modeConfig.gameConfig.previewCount ?? 1,
    allowHold: modeConfig.gameConfig.allowHold ?? false,
    seed: 0,
    rotationSystem: modeConfig.gameConfig.rotationSystem ?? 'srs',
  });

  // Override with human randomizer
  game.randomizer = randomizer;

  // Reset current piece from human randomizer
  const firstPiece = randomizer.next();
  game.currentPiece = firstPiece;
  game.currentRotation = modeConfig.getSpawnRotation(firstPiece);
  const spawn = modeConfig.getSpawnPosition(firstPiece, BOARD_WIDTH, BOARD_HEIGHT);
  game.currentX = spawn.x;
  game.currentY = spawn.y;
  // Apply initial drop (Guideline: drop 1 row after spawn if possible)
  if (game.config.initialDrop) {
    if (!game.board.collides(game.currentPiece, game.currentRotation, game.currentX, game.currentY - 1)) {
      game.currentY--;
    }
  }
  game.gameOver = false;

  const colorBoard = new ColorBoard(BOARD_WIDTH, BOARD_HEIGHT + bufferRows);

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

  // If the preview is still short (e.g. bot used hold, consuming 2 pieces),
  // stay in WAITING_FOR_PLAYER so the user fills the remaining slot(s).
  const game = refs.game!;
  const previewCount = game.config.previewCount ?? 1;
  if (game.getPreview().length < previewCount) {
    return getViewFromEngine(refs, 'WAITING_FOR_PLAYER', currentScore, currentPiecesPlaced, null);
  }

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
    ghostY: refs.modeConfig?.showGhost
      ? getGhostY(refs.game!.board, frame.piece, frame.rotation, frame.x, frame.y)
      : null,
    activeInput: frame.input,
  };
}

export function applyPlacement(
  refs: EngineRefs,
  placement: Placement,
  currentScore: ViewState['scoreState'],
  currentPiecesPlaced: number,
): ViewState {
  const { game, colorBoard, modeConfig } = refs;
  if (!game || !colorBoard) return createInitialView(modeConfig ?? undefined);

  const visibleBuffer = modeConfig?.visibleBuffer ?? 0;
  const bufferRows = modeConfig?.gameConfig.bufferRows ?? 20;

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
    for (let y = 0; y < BOARD_HEIGHT + bufferRows; y++) {
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
    const preClearCells = extractBoardCells(colorBoard, visibleBuffer);

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
