import { useCallback, useEffect, useRef, useState } from 'react';
import { Piece, type Placement } from '@core/types';
import type { GameMode, ModeConfig } from '@core/mode';
import { classicMode, modernMode } from '@core/mode';
import { expectimaxSelect } from '@ai/expectimax';
import { beamSearchSelect } from '@ai/beam';
import { planAnimation, type AnimationKeyframe } from '@web/engine/AnimationPlanner';
import {
  SPAWN_DELAY,
  MOVE_DELAY,
  ROTATE_DELAY,
  DROP_DELAY,
  LOCK_DELAY,
  LINE_FLASH_DELAY,
  LINE_COLLAPSE_DELAY,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from '@web/utils/constants';
import type { ViewState } from '@web/state/types';
import {
  createEngineRefs,
  createInitialView,
  startGame,
  pickPiece,
  pickNextPiece,
  applyAnimationFrame,
  applyPlacement,
  extractBoardCells,
  computeCollapseShifts,
  type EngineRefs,
} from '@web/state/reducer';

export interface GameControls {
  view: ViewState;
  onStart: (mode: GameMode) => void;
  onPickPiece: (piece: Piece) => void;
  onRestart: () => void;
  speed: number;
  setSpeed: (s: number) => void;
}

function frameDelay(type: AnimationKeyframe['type']): number {
  switch (type) {
    case 'spawn': return SPAWN_DELAY;
    case 'move': return MOVE_DELAY;
    case 'rotate': return ROTATE_DELAY;
    case 'drop': return DROP_DELAY;
    case 'lock': return LOCK_DELAY;
    default: return MOVE_DELAY;
  }
}

export function useGameLoop(): GameControls {
  const engineRefs = useRef<EngineRefs>(createEngineRefs());
  const [view, setView] = useState<ViewState>(createInitialView);
  const [speed, setSpeed] = useState(0.5);

  // "Latest value" refs for use inside async callbacks
  const viewRef = useRef(view);
  viewRef.current = view;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Generation counter — incremented on cancel/restart to invalidate stale callbacks
  const genRef = useRef(0);

  // rAF-based animation state
  const animRef = useRef<{
    keyframes: AnimationKeyframe[];
    placement: Placement;
    frameIndex: number;
    lastAdvance: number; // timestamp of last frame advance
    rafId: number;
    gen: number;
  } | null>(null);

  // Timeout ref for line-clear delay and AI thinking delay
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAll = useCallback(() => {
    genRef.current++;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current.rafId);
      animRef.current = null;
    }
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // The core rAF loop: advances one animation frame per elapsed delay,
  // guaranteeing each position is rendered for at least one display frame.
  const startAnimLoop = useCallback((
    keyframes: AnimationKeyframe[],
    placement: Placement,
    gen: number,
  ) => {
    const anim: NonNullable<typeof animRef.current> = {
      keyframes,
      placement,
      frameIndex: 0,
      lastAdvance: performance.now(),
      rafId: 0,
      gen,
    };
    animRef.current = anim;

    // Show first keyframe immediately (spawn)
    const v = viewRef.current;
    setView(applyAnimationFrame(engineRefs.current, keyframes[0]!, v.scoreState, v.piecesPlaced));
    anim.frameIndex = 1;

    const loop = (timestamp: number) => {
      // Check if cancelled
      if (genRef.current !== anim.gen) return;

      const currentFrame = anim.keyframes[anim.frameIndex];

      // All keyframes shown — commit placement to engine
      if (!currentFrame) {
        const v = viewRef.current;
        const mc = engineRefs.current.modeConfig;
        const visibleBuffer = mc?.visibleBuffer ?? 0;
        const totalH = BOARD_HEIGHT + visibleBuffer;
        let finalView: ViewState;
        try {
          finalView = applyPlacement(engineRefs.current, placement, v.scoreState, v.piecesPlaced);
        } catch {
          // Engine error — transition to game over
          animRef.current = null;
          setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
          return;
        }
        animRef.current = null;
        setView(finalView);

        if (finalView.phase === 'GAME_OVER') return;

        if (finalView.clearingLines && finalView.clearingLines.length > 0) {
          const clearedRows = finalView.clearingLines;

          // Phase 1 → Phase 2: after flash, start collapse
          timerRef.current = setTimeout(() => {
            if (genRef.current !== gen) return;

            // Switch to post-clear board + collapse animation
            const cb = engineRefs.current.colorBoard;
            const postClearCells = cb ? extractBoardCells(cb, visibleBuffer) : finalView.boardCells;
            const shifts = computeCollapseShifts(clearedRows, totalH);

            setView(prev => ({
              ...prev,
              clearingLines: null,
              boardCells: postClearCells,
              collapseShifts: shifts,
            }));

            // Phase 2 → Done: after collapse, ready for next piece
            timerRef.current = setTimeout(() => {
              if (genRef.current !== gen) return;
              setView(prev => ({
                ...prev,
                collapseShifts: null,
                phase: 'WAITING_FOR_PLAYER',
              }));
            }, LINE_COLLAPSE_DELAY / speedRef.current);
          }, LINE_FLASH_DELAY / speedRef.current);
        }
        return;
      }

      // Wait for the PREVIOUS (currently displayed) frame's delay before advancing
      const prevFrame = anim.keyframes[anim.frameIndex - 1] ?? anim.keyframes[0]!;
      const targetDelay = frameDelay(prevFrame.type) / speedRef.current;
      const elapsed = timestamp - anim.lastAdvance;

      if (elapsed >= targetDelay) {
        const v = viewRef.current;
        setView(applyAnimationFrame(engineRefs.current, currentFrame, v.scoreState, v.piecesPlaced));
        anim.frameIndex++;
        anim.lastAdvance = timestamp;
      }

      anim.rafId = requestAnimationFrame(loop);
    };

    anim.rafId = requestAnimationFrame(loop);
  }, []);

  // AI thinking effect
  useEffect(() => {
    if (view.phase !== 'BOT_THINKING') return;

    const game = engineRefs.current.game;
    const mc = engineRefs.current.modeConfig;
    if (!game || !mc) return;

    // Check if game is already over (safety check)
    if (game.gameOver) {
      setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
      return;
    }

    const gen = genRef.current;

    const id = setTimeout(() => {
      if (genRef.current !== gen) return;

      let placement: Placement | null;
      try {
        const snapshot = game.snapshot();
        if (mc.aiType === 'beam') {
          placement = beamSearchSelect(
            snapshot, mc.weights,
            { depth: mc.aiConfig.depth, beamWidth: mc.aiConfig.beamWidth ?? 100 },
            mc.tryRotate, mc.getSpawnRotation, mc.getSpawnPosition,
          );
        } else {
          placement = expectimaxSelect(
            snapshot, mc.weights,
            { depth: mc.aiConfig.depth },
            mc.tryRotate, mc.getSpawnRotation, mc.getSpawnPosition,
          );
        }
      } catch {
        // AI error — transition to game over
        setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
        return;
      }

      if (!placement) {
        setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
        return;
      }

      const hasHardDrop = mc.mode === 'modern';
      const hasInitialDrop = mc.gameConfig.initialDrop ?? false;
      const keyframes = planAnimation(
        game.board, placement, BOARD_WIDTH, BOARD_HEIGHT,
        mc.tryRotate, mc.getSpawnRotation(placement.piece), mc.getSpawnPosition,
        hasHardDrop, hasInitialDrop,
      );

      if (keyframes.length === 0) {
        const v = viewRef.current;
        try {
          setView(applyPlacement(engineRefs.current, placement, v.scoreState, v.piecesPlaced));
        } catch {
          setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
        }
        return;
      }

      startAnimLoop(keyframes, placement, gen);
    }, 30);

    timerRef.current = id;
    return () => clearTimeout(id);
  }, [view.phase, startAnimLoop]);

  // Cleanup on unmount
  useEffect(() => cancelAll, [cancelAll]);

  const onStart = useCallback((mode: GameMode) => {
    cancelAll();
    const mc = mode === 'classic' ? classicMode() : modernMode();
    setView(startGame(engineRefs.current, mc));
  }, [cancelAll]);

  const onPickPiece = useCallback((piece: Piece) => {
    const v = viewRef.current;
    if (v.phase === 'PICKING') {
      setView(pickPiece(engineRefs.current, piece, v));
    } else if (v.phase === 'WAITING_FOR_PLAYER') {
      setView(pickNextPiece(engineRefs.current, piece, v.scoreState, v.piecesPlaced));
    }
  }, []);

  const onRestart = useCallback(() => {
    cancelAll();
    engineRefs.current = createEngineRefs();
    setView(createInitialView());
  }, [cancelAll]);

  return { view, onStart, onPickPiece, onRestart, speed, setSpeed };
}
