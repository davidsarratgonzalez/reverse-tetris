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

const HARD_DROP_BUTTON = { id: 'hardDrop' as BotInput, label: 'DROP', symbol: '\u2913' };

export function InputDisplay({ activeInput, mode }: InputDisplayProps) {
  const showHardDrop = mode === 'modern';

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
        {showHardDrop && (
          <div
            className={`input-btn ${activeInput === HARD_DROP_BUTTON.id ? 'input-btn--active' : ''}`}
          >
            <span className="input-btn-symbol">{HARD_DROP_BUTTON.symbol}</span>
            <span className="input-btn-label">{HARD_DROP_BUTTON.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
