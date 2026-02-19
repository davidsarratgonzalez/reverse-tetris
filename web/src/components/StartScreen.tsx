import type { GameMode } from '@core/mode';

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="start-screen">
      <div className="start-content">
        <h1 className="nes-title">Reverse Tetris</h1>
        <p className="start-subtitle">
          The bot plays. You choose the pieces.
        </p>
        <p className="start-desc">
          Can you defeat the AI by picking the worst pieces?
        </p>
        <div className="mode-select">
          <button
            className="nes-btn nes-btn--accent mode-btn"
            onClick={() => onStart('classic')}
          >
            Classic NES
          </button>
          <p className="mode-desc">
            NRS rotation (no wall kicks) &middot; 1 preview &middot; No hold
          </p>
          <button
            className="nes-btn nes-btn--accent mode-btn"
            onClick={() => onStart('modern')}
          >
            Modern Guideline
          </button>
          <p className="mode-desc">
            SRS rotation (wall kicks) &middot; 5 preview &middot; Hold piece &middot; Ghost
          </p>
        </div>
        <div className="start-rules">
          <p>How to play:</p>
          <ol>
            <li>Select a mode and pick the starting pieces</li>
            <li>Watch the bot play each piece</li>
            <li>After each move, pick the next piece</li>
            <li>Try to make the bot top out!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
