import { useGameLoop } from '@web/hooks/useGameLoop';
import { Board } from '@web/components/Board';
import { ScorePanel } from '@web/components/ScorePanel';
import { PiecePreview } from '@web/components/PiecePreview';
import { PieceSelector } from '@web/components/PieceSelector';
import { StartScreen } from '@web/components/StartScreen';
import { GameOverOverlay } from '@web/components/GameOverOverlay';
import { SpeedControl } from '@web/components/SpeedControl';
import './styles/layout.css';
import './styles/board.css';
import './styles/selector.css';

export function App() {
  const { view, onStart, onPickPiece, onRestart, speed, setSpeed } = useGameLoop();

  if (view.phase === 'START_SCREEN') {
    return <StartScreen onStart={onStart} />;
  }

  const canPick =
    view.phase === 'PICKING_FIRST' ||
    view.phase === 'PICKING_SECOND' ||
    view.phase === 'WAITING_FOR_PLAYER';

  const selectorLabel =
    view.phase === 'PICKING_FIRST'
      ? 'Pick the first piece'
      : view.phase === 'PICKING_SECOND'
        ? 'Pick the preview piece'
        : 'Choose next piece';

  const phaseLabel =
    view.phase === 'BOT_THINKING'
      ? 'Bot is thinking...'
      : view.phase === 'BOT_ANIMATING'
        ? 'Bot is playing...'
        : view.phase === 'PICKING_FIRST' || view.phase === 'PICKING_SECOND'
          ? 'Your turn'
          : view.phase === 'WAITING_FOR_PLAYER'
            ? 'Pick the next piece!'
            : '';

  return (
    <div className="game-layout">
      {/* Left panel */}
      <div className="side-panel side-panel--left">
        <ScorePanel scoreState={view.scoreState} piecesPlaced={view.piecesPlaced} />
        <SpeedControl speed={speed} setSpeed={setSpeed} />
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
