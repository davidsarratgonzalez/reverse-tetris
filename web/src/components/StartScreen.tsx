interface StartScreenProps {
  onStart: () => void;
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
        <button className="nes-btn nes-btn--accent start-btn" onClick={onStart}>
          Start Game
        </button>
        <div className="start-rules">
          <p>How to play:</p>
          <ol>
            <li>Pick the first two pieces to begin</li>
            <li>Watch the bot play each piece</li>
            <li>After each move, pick the next piece</li>
            <li>Try to make the bot top out!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
