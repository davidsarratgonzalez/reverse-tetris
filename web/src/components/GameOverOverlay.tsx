import type { ScoreState } from '@web/engine/scoring';

interface GameOverOverlayProps {
  scoreState: ScoreState;
  piecesPlaced: number;
  onRestart: () => void;
}

export function GameOverOverlay({ scoreState, piecesPlaced, onRestart }: GameOverOverlayProps) {
  return (
    <div className="game-over-overlay">
      <div className="game-over-content nes-panel">
        <h2 className="nes-title">Game Over</h2>
        <div className="game-over-stats">
          <div className="score-row">
            <span className="nes-label">Final Score</span>
            <span className="nes-value">{scoreState.score.toLocaleString()}</span>
          </div>
          <div className="score-row">
            <span className="nes-label">Lines</span>
            <span className="nes-value">{scoreState.lines}</span>
          </div>
          <div className="score-row">
            <span className="nes-label">Pieces</span>
            <span className="nes-value">{piecesPlaced}</span>
          </div>
          <div className="score-row">
            <span className="nes-label">Level</span>
            <span className="nes-value">{scoreState.level}</span>
          </div>
        </div>
        {piecesPlaced > 100 ? (
          <p className="game-over-msg">The bot survived {piecesPlaced} pieces. Well played!</p>
        ) : (
          <p className="game-over-msg">You defeated the bot quickly! Nice work!</p>
        )}
        <button className="nes-btn nes-btn--accent" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  );
}
