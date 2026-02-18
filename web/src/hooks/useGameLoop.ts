import { useCallback, useEffect, useRef, useState } from 'react';
import { Piece, type Placement } from '@core/types';
import { BCTS_WEIGHTS } from '@ai/evaluator';
import { expectimaxSelect } from '@ai/expectimax';
import { planAnimation, type AnimationKeyframe } from '@web/engine/AnimationPlanner';
import {
  MOVE_DELAY,
  ROTATE_DELAY,
  DROP_DELAY,
  LOCK_DELAY,
  LINE_CLEAR_DELAY,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from '@web/utils/constants';
import type { ViewState } from '@web/state/types';
import {
  createEngineRefs,
  createInitialView,
  startGame,
  pickFirstPiece,
  pickSecondPiece,
  pickNextPiece,
  applyAnimationFrame,
  applyPlacement,
  type EngineRefs,
} from '@web/state/reducer';

export interface GameControls {
  view: ViewState;
  onStart: () => void;
  onPickPiece: (piece: Piece) => void;
  onRestart: () => void;
  speed: number;
  setSpeed: (s: number) => void;
}

function frameDelay(type: AnimationKeyframe['type']): number {
  switch (type) {
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
        const finalView = applyPlacement(engineRefs.current, placement, v.scoreState, v.piecesPlaced);
        animRef.current = null;
        setView(finalView);

        if (finalView.clearingLines && finalView.clearingLines.length > 0) {
          timerRef.current = setTimeout(() => {
            if (genRef.current !== gen) return;
            setView(prev => ({ ...prev, clearingLines: null }));
          }, LINE_CLEAR_DELAY / speedRef.current);
        }
        return;
      }

      // Check if enough time has elapsed to advance one frame
      const targetDelay = frameDelay(currentFrame.type) / speedRef.current;
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
    if (!game) return;

    const gen = genRef.current;

    const id = setTimeout(() => {
      if (genRef.current !== gen) return;

      const snapshot = game.snapshot();
      const placement = expectimaxSelect(snapshot, BCTS_WEIGHTS, { depth: 2 });

      if (!placement) {
        setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
        return;
      }

      const keyframes = planAnimation(game.board, placement, BOARD_WIDTH, BOARD_HEIGHT);

      if (keyframes.length === 0) {
        const v = viewRef.current;
        setView(applyPlacement(engineRefs.current, placement, v.scoreState, v.piecesPlaced));
        return;
      }

      startAnimLoop(keyframes, placement, gen);
    }, 30);

    timerRef.current = id;
    return () => clearTimeout(id);
  }, [view.phase, startAnimLoop]);

  // Cleanup on unmount
  useEffect(() => cancelAll, [cancelAll]);

  const onStart = useCallback(() => {
    cancelAll();
    setView(startGame(engineRefs.current));
  }, [cancelAll]);

  const onPickPiece = useCallback((piece: Piece) => {
    const v = viewRef.current;
    if (v.phase === 'PICKING_FIRST') {
      setView(pickFirstPiece(engineRefs.current, piece));
    } else if (v.phase === 'PICKING_SECOND') {
      setView(pickSecondPiece(engineRefs.current, piece));
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
