import { useGameLoop } from '@web/hooks/useGameLoop';
import { Board } from '@web/components/Board';
import { ScorePanel } from '@web/components/ScorePanel';
import { PiecePreview } from '@web/components/PiecePreview';
import { PieceSelector } from '@web/components/PieceSelector';
import { InputDisplay } from '@web/components/InputDisplay';
import { StartScreen } from '@web/components/StartScreen';
import { GameOverOverlay } from '@web/components/GameOverOverlay';
import { SpeedControl } from '@web/components/SpeedControl';
import './styles/layout.css';
import './styles/board.css';
import './styles/selector.css';
import './styles/input-display.css';

export function App() {
  const { view, onStart, onPickPiece, onRestart, speed, setSpeed } = useGameLoop();

  if (view.phase === 'START_SCREEN') {
    return <StartScreen onStart={onStart} />;
  }

  const canPick =
    view.phase === 'PICKING' ||
    view.phase === 'WAITING_FOR_PLAYER';

  const selectorLabel =
    view.phase === 'PICKING'
      ? `Pick piece (${view.picksRemaining} left)`
      : 'Choose next piece';

  const phaseLabel =
    view.phase === 'BOT_THINKING'
      ? 'Bot is thinking...'
      : view.phase === 'BOT_ANIMATING'
        ? 'Bot is playing...'
        : view.phase === 'LINE_CLEARING'
          ? 'Lines cleared!'
          : view.phase === 'PICKING'
            ? 'Your turn'
            : view.phase === 'WAITING_FOR_PLAYER'
              ? 'Pick the next piece!'
              : '';

  const isModern = view.mode === 'modern';
  const previewCount = isModern ? 5 : 1;

  // During PICKING: split pickedPieces into current (first) + preview (rest), pad with nulls
  // During gameplay: pad preview when randomizer is short (e.g. after hold)
  let displayCurrent: import('@core/types').Piece | null;
  let displayPreview: (import('@core/types').Piece | null)[];

  if (view.phase === 'PICKING') {
    const picked = view.pickedPieces;
    displayCurrent = picked[0] ?? null;
    const previewPicked = picked.slice(1);
    displayPreview = [...previewPicked];
    while (displayPreview.length < previewCount) {
      displayPreview.push(null);
    }
  } else {
    displayCurrent = view.currentPiece;
    // Pad ALL missing slots with null (e.g. 2 empty after hold)
    displayPreview = [...view.preview];
    while (displayPreview.length < previewCount) {
      displayPreview.push(null);
    }
  }

  return (
    <div className="game-layout">
      {/* Left panel */}
      <div className="side-panel side-panel--left">
        <ScorePanel scoreState={view.scoreState} piecesPlaced={view.piecesPlaced} />
        <SpeedControl speed={speed} setSpeed={setSpeed} />
        <InputDisplay activeInput={view.activeInput} mode={view.mode} />
      </div>

      {/* Center: board + selector */}
      <div className="center-panel">
        <div className="phase-indicator">
          <span className={`phase-text ${view.phase === 'WAITING_FOR_PLAYER' ? 'phase-text--highlight' : ''}`}>
            {phaseLabel}
          </span>
        </div>
        <Board view={view} />
        <PieceSelector
          onPick={onPickPiece}
          disabled={!canPick}
          label={selectorLabel}
        />
      </div>

      {/* Right panel */}
      <div className="side-panel side-panel--right">
        <PiecePreview
          pieces={[displayCurrent]}
          label="Current"
          highlightNextPending={view.phase === 'PICKING' && displayCurrent == null}
        />
        <PiecePreview
          pieces={displayPreview}
          label="Next"
          highlightNextPending={
            (view.phase === 'PICKING' && displayCurrent != null) ||
            view.phase === 'WAITING_FOR_PLAYER'
          }
        />
        {isModern && (
          <PiecePreview
            pieces={[view.holdPiece ?? null]}
            label="Hold"
            placeholder="-"
          />
        )}
      </div>

      {/* Game over overlay */}
      {view.phase === 'GAME_OVER' && (
        <GameOverOverlay
          scoreState={view.scoreState}
          piecesPlaced={view.piecesPlaced}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
