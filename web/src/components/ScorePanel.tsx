import type { ScoreState } from '@web/engine/scoring';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

interface ScorePanelProps {
  scoreState: ScoreState;
  piecesPlaced: number;
}

export function ScorePanel({ scoreState, piecesPlaced }: ScorePanelProps) {
  return (
    <div className="score-panel nes-panel">
      <div className="score-row">
        <span className="nes-label">Score</span>
        <span className="nes-value">{formatNumber(scoreState.score)}</span>
      </div>
      <div className="score-row">
        <span className="nes-label">Lines</span>
        <span className="nes-value">{scoreState.lines}</span>
      </div>
      <div className="score-row">
        <span className="nes-label">Level</span>
        <span className="nes-value">{scoreState.level}</span>
      </div>
      <div className="score-row">
        <span className="nes-label">Pieces</span>
        <span className="nes-value">{piecesPlaced}</span>
      </div>
    </div>
  );
}
