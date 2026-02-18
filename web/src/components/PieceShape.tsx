import { Piece, Rotation } from '@core/types';
import { PIECE_CELLS, PIECE_BBOX_W } from '@core/constants';
import { PIECE_COLORS, PIECE_COLORS_DARK, PIECE_COLORS_LIGHT } from '@web/utils/pieceColors';

interface PieceShapeProps {
  piece: Piece;
  cellSize: number;
  rotation?: Rotation;
  ghost?: boolean;
  className?: string;
}

export function PieceShape({ piece, cellSize, rotation = Rotation.R0, ghost, className }: PieceShapeProps) {
  const cells = PIECE_CELLS[piece]![rotation]!;
  const bboxW = PIECE_BBOX_W[piece]!;
  const bboxH = piece === Piece.I ? 4 : 3;
  const size = bboxW * cellSize;
  const height = bboxH * cellSize;

  const color = PIECE_COLORS[piece];
  const light = PIECE_COLORS_LIGHT[piece];
  const dark = PIECE_COLORS_DARK[piece];

  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${bboxW} ${bboxH}`}
      className={className}
      style={{ display: 'block' }}
    >
      {cells.map((cell, i) => {
        // SVG Y is top-down, but our cells have Y+ = up, so flip
        const svgY = bboxH - 1 - cell.y;
        return (
          <g key={i}>
            <rect
              x={cell.x}
              y={svgY}
              width={1}
              height={1}
              fill={ghost ? 'transparent' : color}
              stroke={ghost ? color : dark}
              strokeWidth={ghost ? 0.08 : 0.06}
              opacity={ghost ? 0.3 : 1}
            />
            {!ghost && (
              <>
                {/* NES-style highlight */}
                <rect x={cell.x + 0.05} y={svgY + 0.05} width={0.4} height={0.12} fill={light} opacity={0.6} />
                <rect x={cell.x + 0.05} y={svgY + 0.05} width={0.12} height={0.4} fill={light} opacity={0.6} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
