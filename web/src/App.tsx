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

  return (
    <div className="game-layout">
      {/* Left panel */}
      <div className="side-panel side-panel--left">
        <ScorePanel scoreState={view.scoreState} piecesPlaced={view.piecesPlaced} />
        <SpeedControl speed={speed} setSpeed={setSpeed} />
        <InputDisplay activeInput={view.activeInput} mode={view.mode} />
        {isModern && view.holdPiece != null && (
          <PiecePreview pieces={[view.holdPiece]} label="Hold" />
        )}
      </div>

      {/* Center: board */}
      <div className="center-panel">
        <div className="phase-indicator">
          <span className={`phase-text ${view.phase === 'WAITING_FOR_PLAYER' ? 'phase-text--highlight' : ''}`}>
            {phaseLabel}
          </span>
        </div>
        <Board view={view} />
      </div>

      {/* Right panel */}
      <div className="side-panel side-panel--right">
        {view.currentPiece != null && (
          <PiecePreview
            pieces={[view.currentPiece]}
            label="Current"
          />
        )}
        <PiecePreview pieces={view.preview} label="Next" />
        <PieceSelector
          onPick={onPickPiece}
          disabled={!canPick}
          label={selectorLabel}
        />
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
