interface SpeedControlProps {
  speed: number;
  setSpeed: (s: number) => void;
}

const SPEEDS = [
  { label: '1x', value: 0.5 },
  { label: '2x', value: 1 },
  { label: '4x', value: 2 },
  { label: '8x', value: 4 },
];

export function SpeedControl({ speed, setSpeed }: SpeedControlProps) {
  return (
    <div className="speed-control nes-panel">
      <span className="nes-label">Speed</span>
      <div className="speed-buttons">
        {SPEEDS.map(({ label, value }) => (
          <button
            key={value}
            className={`speed-btn ${speed === value ? 'speed-btn--active' : ''}`}
            onClick={() => setSpeed(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
