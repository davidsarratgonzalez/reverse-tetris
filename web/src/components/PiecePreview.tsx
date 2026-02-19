import { Piece, Rotation } from '@core/types';
import { PieceShape } from './PieceShape';
import { PREVIEW_CELL_SIZE } from '@web/utils/constants';

interface PiecePreviewProps {
  pieces: (Piece | null)[];
  label?: string;
  placeholder?: string;
  highlightNextPending?: boolean;
}

export function PiecePreview({ pieces, label = 'Next', placeholder = '?', highlightNextPending }: PiecePreviewProps) {
  let firstPendingFound = false;

  return (
    <div className="piece-preview nes-panel">
      <span className="nes-label">{label}</span>
      <div className="preview-pieces">
        {pieces.map((piece, i) => {
          const isPending = piece == null;
          const isActive = isPending && highlightNextPending && !firstPendingFound;
          if (isActive) firstPendingFound = true;

          return (
            <div key={i} className="preview-piece">
              {piece != null ? (
                <PieceShape piece={piece} cellSize={PREVIEW_CELL_SIZE} />
              ) : (
                <span className={`preview-pending ${isActive ? 'preview-pending--active' : ''}`}>
                  {placeholder}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
