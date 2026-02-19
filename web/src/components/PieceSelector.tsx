import { Piece } from '@core/types';
import { PieceShape } from './PieceShape';
import { PIECE_NAMES, PIECE_COLORS } from '@web/utils/pieceColors';
import { SELECTOR_CELL_SIZE } from '@web/utils/constants';

const ALL_PIECES: Piece[] = [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L];

interface PieceSelectorProps {
  onPick: (piece: Piece) => void;
  disabled: boolean;
  label?: string;
  preselected?: Piece | null;
}

export function PieceSelector({ onPick, disabled, label, preselected }: PieceSelectorProps) {
  const pickRandom = () => {
    const piece = ALL_PIECES[Math.floor(Math.random() * ALL_PIECES.length)]!;
    onPick(piece);
  };

  return (
    <div className="piece-selector nes-panel">
      {label && <span className="nes-label">{label}</span>}
      <div className="selector-grid">
        {ALL_PIECES.map((piece) => (
          <button
            key={piece}
            className={`selector-btn ${preselected === piece ? 'selector-btn--preselected' : ''}`}
            onClick={() => onPick(piece)}
            disabled={disabled}
            title={`Pick ${PIECE_NAMES[piece]}`}
            style={{
              '--piece-color': PIECE_COLORS[piece],
            } as React.CSSProperties}
          >
            <PieceShape piece={piece} cellSize={SELECTOR_CELL_SIZE} />
          </button>
        ))}
        <button
          className="selector-btn selector-btn--random"
          onClick={pickRandom}
          disabled={disabled}
          title="Pick random piece"
        >
          <span className="selector-random-label">?</span>
        </button>
      </div>
    </div>
  );
}
