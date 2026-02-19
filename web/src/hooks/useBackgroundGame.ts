import { useCallback, useEffect, useRef, useState } from 'react';
import { Piece, Rotation } from '@core/types';
import { Game } from '@core/game';
import { beamSearchSelect } from '@ai/beam';
import { BCTS_WEIGHTS } from '@ai/evaluator';
import { planAnimation, getGhostY, type AnimationKeyframe } from '@web/engine/AnimationPlanner';
import { ColorBoard } from '@web/engine/ColorBoard';
import { extractBoardCells } from '@web/state/reducer';
import type { ViewState } from '@web/state/types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@web/utils/constants';

const BG_SPEED = 3; // animation speed multiplier
const SPAWN_MS = 150 / BG_SPEED;
const MOVE_MS = 60 / BG_SPEED;
const ROTATE_MS = 80 / BG_SPEED;
const DROP_MS = 35 / BG_SPEED;
const LOCK_MS = 200 / BG_SPEED;
const LINE_CLEAR_MS = 400 / BG_SPEED;
const RESTART_MS = 1500;

function frameDelay(type: AnimationKeyframe['type']): number {
  switch (type) {
    case 'spawn': return SPAWN_MS;
    case 'move': return MOVE_MS;
    case 'rotate': return ROTATE_MS;
    case 'drop': return DROP_MS;
    case 'lock': return LOCK_MS;
    default: return MOVE_MS;
  }
}

function createGame(): { game: Game; colorBoard: ColorBoard } {
  const game = new Game({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    bufferRows: 20,
    previewCount: 5,
    randomizer: 'bag7',
    allowHold: false,
    seed: (Math.random() * 0xFFFFFFFF) | 0,
    rotationSystem: 'srs',
    initialDrop: true,
    truncateLock: false,
  });
  const colorBoard = new ColorBoard(BOARD_WIDTH, BOARD_HEIGHT + 20);
  return { game, colorBoard };
}

/** Minimal view state for the Board component */
function buildView(
  colorBoard: ColorBoard,
  activePiece: ViewState['activePiece'],
  ghostY: number | null,
  clearingLines: number[] | null,
): Pick<ViewState, 'boardCells' | 'activePiece' | 'ghostY' | 'showGhost' | 'visibleBuffer'
  | 'boardWidth' | 'boardHeight' | 'clearingLines' | 'collapseShifts' | 'phase' | 'mode'
  | 'currentPiece' | 'preview' | 'holdPiece' | 'scoreState' | 'piecesPlaced'
  | 'picksRemaining' | 'pickedPieces' | 'activeInput' | 'gameOver'> {
  return {
    phase: 'BOT_ANIMATING',
    mode: 'modern',
    boardCells: extractBoardCells(colorBoard, 0),
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    activePiece,
    ghostY,
    showGhost: true,
    visibleBuffer: 0,
    clearingLines,
    collapseShifts: null,
    currentPiece: null,
    preview: [],
    holdPiece: null,
    scoreState: { score: 0, lines: 0, level: 0 },
    piecesPlaced: 0,
    picksRemaining: 0,
    pickedPieces: [],
    activeInput: null,
    gameOver: false,
  };
}

export function useBackgroundGame(): ViewState {
  const refs = useRef<{ game: Game; colorBoard: ColorBoard } | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView] = useState<ViewState>(() => {
    const { game, colorBoard } = createGame();
    refs.current = { game, colorBoard };
    return buildView(colorBoard, null, null, null) as ViewState;
  });

  const tick = useCallback(() => {
    const r = refs.current;
    if (!r) return;
    const { game, colorBoard } = r;

    if (game.gameOver) {
      // Restart after a delay
      timerRef.current = setTimeout(() => {
        const fresh = createGame();
        refs.current = fresh;
        setView(buildView(fresh.colorBoard, null, null, null) as ViewState);
        timerRef.current = setTimeout(() => tick(), 200);
      }, RESTART_MS);
      return;
    }

    // AI selects placement
    const snapshot = game.snapshot();
    let placement;
    try {
      placement = beamSearchSelect(
        snapshot, BCTS_WEIGHTS,
        { depth: 3, beamWidth: 25 },
        game.rotateFn, game.spawnRotFn, game.spawnPosFn,
      );
    } catch {
      placement = null;
    }

    if (!placement) {
      game.gameOver = true;
      timerRef.current = setTimeout(() => tick(), RESTART_MS);
      return;
    }

    // Plan animation keyframes
    const keyframes = planAnimation(
      game.board, placement, BOARD_WIDTH, BOARD_HEIGHT,
      game.rotateFn, game.spawnRotFn(placement.piece), game.spawnPosFn,
      true, true,
    );

    if (keyframes.length === 0) {
      // No animation possible — just apply
      colorBoard.placePiece(placement.piece, placement.rotation, placement.x, placement.y);
      game.applyPlacement(placement);
      colorBoard.syncWithBoard(game.board);
      setView(buildView(colorBoard, null, null, null) as ViewState);
      timerRef.current = setTimeout(() => tick(), 100);
      return;
    }

    // Animate through keyframes using rAF
    let frameIndex = 0;
    let lastAdvance = performance.now();

    const showFrame = (kf: AnimationKeyframe) => {
      const gy = getGhostY(game.board, kf.piece, kf.rotation, kf.x, kf.y);
      setView(buildView(
        colorBoard,
        { piece: kf.piece, rotation: kf.rotation, x: kf.x, y: kf.y },
        gy !== kf.y ? gy : null,
        null,
      ) as ViewState);
    };

    // Show first frame
    showFrame(keyframes[0]!);
    frameIndex = 1;

    const loop = (timestamp: number) => {
      const kf = keyframes[frameIndex];
      if (!kf) {
        // Animation done — commit placement
        colorBoard.placePiece(placement.piece, placement.rotation, placement.x, placement.y);
        const result = game.applyPlacement(placement);

        if (result.linesCleared > 0) {
          // Find full rows for flash
          const fullRows: number[] = [];
          for (let y = 0; y < BOARD_HEIGHT + 20; y++) {
            let full = true;
            for (let x = 0; x < BOARD_WIDTH; x++) {
              if (colorBoard.get(x, y) === null) { full = false; break; }
            }
            if (full) fullRows.push(y);
          }

          // Show flash
          const preClearCells = extractBoardCells(colorBoard, 0);
          setView(prev => ({
            ...prev,
            boardCells: preClearCells,
            activePiece: null,
            ghostY: null,
            clearingLines: fullRows,
          }));

          // After flash, collapse
          colorBoard.clearLines(fullRows);
          colorBoard.syncWithBoard(game.board);
          timerRef.current = setTimeout(() => {
            setView(buildView(colorBoard, null, null, null) as ViewState);
            timerRef.current = setTimeout(() => tick(), 150);
          }, LINE_CLEAR_MS);
        } else {
          colorBoard.syncWithBoard(game.board);
          setView(buildView(colorBoard, null, null, null) as ViewState);
          timerRef.current = setTimeout(() => tick(), 100);
        }
        return;
      }

      const prevKf = keyframes[frameIndex - 1] ?? keyframes[0]!;
      const delay = frameDelay(prevKf.type);
      if (timestamp - lastAdvance >= delay) {
        showFrame(kf);
        frameIndex++;
        lastAdvance = timestamp;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // Start on mount
  useEffect(() => {
    // Small delay so the first render is clean
    timerRef.current = setTimeout(() => tick(), 300);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [tick]);

  return view;
}
