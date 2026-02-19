import { useMemo } from 'react';
import type { GameMode } from '@core/mode';
import { Board } from './Board';
import { useBackgroundGame } from '@web/hooks/useBackgroundGame';

const PIECE_COLORS = ['#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
const SHADOW_MAP: Record<string, string> = {
  '#00f0f0': '#006868',
  '#f0f000': '#686800',
  '#a000f0': '#480068',
  '#00f000': '#006800',
  '#f00000': '#680000',
  '#0000f0': '#000068',
  '#f0a000': '#684800',
};

function randomNoRepeat(colors: string[], count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const available = colors.filter(c => c !== result[i - 1]);
    result.push(available[Math.floor(Math.random() * available.length)]!);
  }
  return result;
}

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const bgView = useBackgroundGame();

  const titleColors = useMemo(() => randomNoRepeat(PIECE_COLORS, 13), []);

  return (
    <div className="start-screen">
      <div className="start-bg">
        <Board view={bgView} />
      </div>
      <div className="start-content">
        <h1 className="start-title">
          <div>
            {'Reverse'.split('').map((ch, i) =>
              <span key={i} style={{ color: titleColors[i]!, textShadow: `2px 2px 0 ${SHADOW_MAP[titleColors[i]!]}` }}>{ch}</span>
            )}
          </div>
          <div>
            {'Tetris'.split('').map((ch, i) =>
              <span key={i + 7} style={{ color: titleColors[i + 7]!, textShadow: `2px 2px 0 ${SHADOW_MAP[titleColors[i + 7]!]}` }}>{ch}</span>
            )}
          </div>
        </h1>
        <p className="start-tagline">
          You choose the pieces.<br />
          The bot plays them.
        </p>

        <div className="mode-select">
          <button
            className="start-mode-btn"
            onClick={() => onStart('classic')}
          >
            <span className="start-mode-name">Classic NES</span>
          </button>
          <button
            className="start-mode-btn"
            onClick={() => onStart('modern')}
          >
            <span className="start-mode-name">Modern Guideline</span>
          </button>
        </div>

        <div className="start-credit">
          <div className="start-credit-line">
            <span>Made with</span>
            <svg className="pixel-heart" viewBox="0 0 8 7" width="12" height="10">
              <rect x="1" y="0" width="2" height="1" fill="#e44" />
              <rect x="5" y="0" width="2" height="1" fill="#e44" />
              <rect x="0" y="1" width="4" height="1" fill="#e44" />
              <rect x="4" y="1" width="4" height="1" fill="#e44" />
              <rect x="0" y="2" width="8" height="1" fill="#e44" />
              <rect x="0" y="3" width="8" height="1" fill="#e44" />
              <rect x="1" y="4" width="6" height="1" fill="#e44" />
              <rect x="2" y="5" width="4" height="1" fill="#e44" />
              <rect x="3" y="6" width="2" height="1" fill="#e44" />
            </svg>
            <span>by</span>
          </div>
          <a className="start-credit-name" href="https://davidsarratgonzalez.github.io" target="_blank" rel="noopener noreferrer">
            David Sarrat Gonz&aacute;lez
          </a>
        </div>
      </div>
    </div>
  );
}
