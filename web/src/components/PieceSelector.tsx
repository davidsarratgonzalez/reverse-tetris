import { Piece } from '@core/types';
import { PieceShape } from './PieceShape';
import { PIECE_NAMES, PIECE_COLORS } from '@web/utils/pieceColors';
import { SELECTOR_CELL_SIZE } from '@web/utils/constants';

const ALL_PIECES: Piece[] = [Piece.I, Piece.O, Piece.T, Piece.S, Piece.Z, Piece.J, Piece.L];

interface PieceSelectorProps {
  onPick: (piece: Piece) => void;
  disabled: boolean;
  label?: string;
}

export function PieceSelector({ onPick, disabled, label }: PieceSelectorProps) {
  return (
    <div className="piece-selector nes-panel">
      {label && <span className="nes-label">{label}</span>}
      <div className="selector-grid">
        {ALL_PIECES.map((piece) => (
          <button
            key={piece}
            className="selector-btn"
            onClick={() => onPick(piece)}
            disabled={disabled}
            title={`Pick ${PIECE_NAMES[piece]}`}
            style={{
              '--piece-color': PIECE_COLORS[piece],
            } as React.CSSProperties}
          >
            <PieceShape piece={piece} cellSize={SELECTOR_CELL_SIZE} />
            <span className="selector-label">{PIECE_NAMES[piece]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
