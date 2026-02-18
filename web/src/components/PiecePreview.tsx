import { Piece, Rotation } from '@core/types';
import { PieceShape } from './PieceShape';
import { PREVIEW_CELL_SIZE } from '@web/utils/constants';

interface PiecePreviewProps {
  pieces: Piece[];
  label?: string;
}

export function PiecePreview({ pieces, label = 'Next' }: PiecePreviewProps) {
  return (
    <div className="piece-preview nes-panel">
      <span className="nes-label">{label}</span>
      <div className="preview-pieces">
        {pieces.length === 0 ? (
          <div className="preview-empty">?</div>
        ) : (
          pieces.map((piece, i) => (
            <div key={i} className="preview-piece">
              <PieceShape piece={piece} cellSize={PREVIEW_CELL_SIZE} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
