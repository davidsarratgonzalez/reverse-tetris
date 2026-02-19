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

/** Uniform display box: 4 wide × 2 tall. All pieces are centered within. */
const DISPLAY_W = 4;
const DISPLAY_H = 2;

export function PieceShape({ piece, cellSize, rotation = Rotation.R0, ghost, className }: PieceShapeProps) {
  const cells = PIECE_CELLS[piece]![rotation]!;
  const bboxH = piece === Piece.I ? 4 : 3;

  // Convert cells to SVG coordinates (Y-flip: our Y+ is up, SVG Y+ is down)
  const svgCells = cells.map(cell => ({
    x: cell.x,
    y: bboxH - 1 - cell.y,
  }));

  // Find actual bounding box of cells
  const minX = Math.min(...svgCells.map(c => c.x));
  const maxX = Math.max(...svgCells.map(c => c.x));
  const minY = Math.min(...svgCells.map(c => c.y));
  const maxY = Math.max(...svgCells.map(c => c.y));

  // Center within uniform display box
  const cellsW = maxX - minX + 1;
  const cellsH = maxY - minY + 1;
  const xShift = (DISPLAY_W - cellsW) / 2 - minX;
  const yShift = (DISPLAY_H - cellsH) / 2 - minY;

  const color = PIECE_COLORS[piece];
  const light = PIECE_COLORS_LIGHT[piece];
  const dark = PIECE_COLORS_DARK[piece];

  return (
    <svg
      width={DISPLAY_W * cellSize}
      height={DISPLAY_H * cellSize}
      viewBox={`0 0 ${DISPLAY_W} ${DISPLAY_H}`}
      className={className}
      style={{ display: 'block' }}
    >
      <g transform={`translate(${xShift}, ${yShift})`}>
        {svgCells.map((cell, i) => (
          <g key={i}>
            <rect
              x={cell.x}
              y={cell.y}
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
                <rect x={cell.x + 0.05} y={cell.y + 0.05} width={0.4} height={0.12} fill={light} opacity={0.6} />
                <rect x={cell.x + 0.05} y={cell.y + 0.05} width={0.12} height={0.4} fill={light} opacity={0.6} />
              </>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
