import { useCallback, useEffect, useRef, useState } from 'react';
import { Piece, type Placement } from '@core/types';
import { BCTS_WEIGHTS } from '@ai/evaluator';
import { greedySelect } from '@ai/greedy';
import { planAnimation, type AnimationKeyframe } from '@web/engine/AnimationPlanner';
import { getAnimationSpeed } from '@web/engine/scoring';
import {
  BASE_FRAME_DELAY,
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

export function useGameLoop(): GameControls {
  const engineRefs = useRef<EngineRefs>(createEngineRefs());
  const [view, setView] = useState<ViewState>(createInitialView);
  const [speed, setSpeed] = useState(1);

  // "Latest value" refs for use inside async callbacks
  const viewRef = useRef(view);
  viewRef.current = view;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Timer ref — always points to the next scheduled timeout
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Generation counter — incremented on cancel/restart to invalidate stale callbacks
  const genRef = useRef(0);

  const clearTimer = useCallback(() => {
    genRef.current++;
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // AI thinking effect
  useEffect(() => {
    if (view.phase !== 'BOT_THINKING') return;

    const game = engineRefs.current.game;
    if (!game) return;

    // Capture generation so we can detect cancellation
    const gen = genRef.current;

    const id = setTimeout(() => {
      if (genRef.current !== gen) return; // cancelled

      const snapshot = game.snapshot();
      const placement = greedySelect(snapshot, BCTS_WEIGHTS);

      if (!placement) {
        setView(prev => ({ ...prev, phase: 'GAME_OVER', gameOver: true }));
        return;
      }

      const keyframes = planAnimation(game.board, placement, BOARD_WIDTH, BOARD_HEIGHT);

      if (keyframes.length === 0) {
        // No animation, directly apply
        const v = viewRef.current;
        setView(applyPlacement(engineRefs.current, placement, v.scoreState, v.piecesPlaced));
        return;
      }

      // Show first keyframe immediately
      const v = viewRef.current;
      setView(applyAnimationFrame(engineRefs.current, keyframes[0]!, v.scoreState, v.piecesPlaced));

      // Chain remaining keyframes via timeouts
      let frameIndex = 1;

      const tick = () => {
        if (genRef.current !== gen) return; // cancelled

        const v = viewRef.current;

        if (frameIndex >= keyframes.length) {
          // Animation complete — commit placement to engine
          const finalView = applyPlacement(
            engineRefs.current,
            placement,
            v.scoreState,
            v.piecesPlaced,
          );
          setView(finalView);

          if (finalView.clearingLines && finalView.clearingLines.length > 0) {
            timerRef.current = setTimeout(() => {
              if (genRef.current !== gen) return;
              setView(prev => ({ ...prev, clearingLines: null }));
            }, LINE_CLEAR_DELAY);
          }
          return;
        }

        const frame = keyframes[frameIndex]!;
        setView(applyAnimationFrame(
          engineRefs.current,
          frame,
          v.scoreState,
          v.piecesPlaced,
        ));

        frameIndex++;

        const delay = frame.type === 'lock'
          ? LOCK_DELAY / speedRef.current
          : getAnimationSpeed(v.scoreState.level, BASE_FRAME_DELAY) / speedRef.current;

        timerRef.current = setTimeout(tick, delay);
      };

      // Schedule first tick with a frame delay
      const firstDelay = getAnimationSpeed(v.scoreState.level, BASE_FRAME_DELAY) / speedRef.current;
      timerRef.current = setTimeout(tick, firstDelay);
    }, 30);

    return () => clearTimeout(id);
  }, [view.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  const onStart = useCallback(() => {
    clearTimer();
    setView(startGame(engineRefs.current));
  }, [clearTimer]);

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
    clearTimer();
    engineRefs.current = createEngineRefs();
    setView(createInitialView());
  }, [clearTimer]);

  return { view, onStart, onPickPiece, onRestart, speed, setSpeed };
}
