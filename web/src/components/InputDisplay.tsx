import type { BotInput } from '@web/engine/AnimationPlanner';
import type { GameMode } from '@core/mode';

interface InputDisplayProps {
  activeInput: BotInput;
  mode: GameMode | null;
}

const ARROW_BUTTONS: { id: BotInput; symbol: string }[] = [
  { id: 'left', symbol: '\u2190' },
  { id: 'down', symbol: '\u2193' },
  { id: 'right', symbol: '\u2192' },
];

const ROTATION_BUTTONS: { id: BotInput; label: string; symbol: string }[] = [
  { id: 'rotateCCW', label: 'CCW', symbol: '\u21BA' },
  { id: 'rotateCW', label: 'CW', symbol: '\u21BB' },
];

export function InputDisplay({ activeInput, mode }: InputDisplayProps) {
  return (
    <div className="input-display">
      <span className="nes-label">Bot input</span>
      <div className="input-row">
        {ARROW_BUTTONS.map(btn => (
          <div
            key={btn.id}
            className={`input-btn ${activeInput === btn.id ? 'input-btn--active' : ''}`}
          >
            <span className="input-btn-symbol">{btn.symbol}</span>
          </div>
        ))}
      </div>
      <div className="input-row">
        {ROTATION_BUTTONS.map(btn => (
          <div
            key={btn.id}
            className={`input-btn ${activeInput === btn.id ? 'input-btn--active' : ''}`}
          >
            <span className="input-btn-symbol">{btn.symbol}</span>
            <span className="input-btn-label">{btn.label}</span>
          </div>
        ))}
        {mode === 'modern' && (
          <div className={`input-btn ${activeInput === 'hold' ? 'input-btn--active' : ''}`}>
            <span className="input-btn-symbol">{'\u21C4'}</span>
            <span className="input-btn-label">HOLD</span>
          </div>
        )}
      </div>
    </div>
  );
}
