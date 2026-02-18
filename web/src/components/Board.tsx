import { Piece, Rotation } from '@core/types';
import { PIECE_CELLS } from '@core/constants';
import { PIECE_COLORS, PIECE_COLORS_DARK, PIECE_COLORS_LIGHT } from '@web/utils/pieceColors';
import { CELL_SIZE, BOARD_WIDTH, BOARD_HEIGHT, VISIBLE_BUFFER } from '@web/utils/constants';
import type { ViewState } from '@web/state/types';

const TOTAL_H = BOARD_HEIGHT + VISIBLE_BUFFER;

interface BoardProps {
  view: ViewState;
}

export function Board({ view }: BoardProps) {
  const { boardCells, activePiece, ghostY, clearingLines, collapseShifts } = view;
  const w = BOARD_WIDTH;
  const h = BOARD_HEIGHT;
  const cellSize = CELL_SIZE;
  const pxW = w * cellSize;
  const pxH = h * cellSize;

  const clearSet = clearingLines ? new Set(clearingLines) : null;

  return (
    <div className="board-container">
      <svg
        width={pxW}
        height={pxH}
        viewBox={`0 0 ${w} ${h}`}
        overflow="visible"
        style={{ display: 'block', background: 'var(--bg-board)' }}
      >
        {/* Grid lines */}
        {Array.from({ length: w + 1 }, (_, x) => (
          <line
            key={`v${x}`}
            x1={x} y1={0} x2={x} y2={h}
            stroke="#1a1a2e"
            strokeWidth={0.03}
          />
        ))}
        {Array.from({ length: h + 1 }, (_, y) => (
          <line
            key={`h${y}`}
            x1={0} y1={y} x2={w} y2={y}
            stroke="#1a1a2e"
            strokeWidth={0.03}
          />
        ))}

        {/* Locked cells (including buffer rows above playfield) */}
        {boardCells.map((piece, idx) => {
          if (piece === null) return null;
          const x = idx % w;
          const boardY = Math.floor(idx / w); // row 0 = bottom
          const svgY = h - 1 - boardY; // SVG Y top-down (negative for buffer rows)
          const inBuffer = boardY >= h;

          const isClearing = clearSet?.has(boardY);
          const color = PIECE_COLORS[piece];
          const light = PIECE_COLORS_LIGHT[piece];
          const dark = PIECE_COLORS_DARK[piece];

          // Flash phase: clearing rows blink white
          if (isClearing) {
            return (
              <g key={idx}>
                <rect
                  x={x} y={svgY} width={1} height={1}
                  fill="#ffffff"
                  stroke="#ffffff"
                  strokeWidth={0.06}
                >
                  <animate
                    attributeName="fill"
                    values={`#ffffff;${color};#ffffff;${color};#ffffff`}
                    dur="0.3s"
                    repeatCount="indefinite"
                  />
                </rect>
              </g>
            );
          }

          // Collapse phase: rows above cleared lines drop down
          const shift = collapseShifts?.[boardY] ?? 0;
          if (shift > 0) {
            return (
              <g key={idx}>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from={`0 ${-shift}`}
                  to="0 0"
                  dur="0.2s"
                  fill="freeze"
                />
                <rect
                  x={x} y={svgY} width={1} height={1}
                  fill={color}
                  stroke={dark}
                  strokeWidth={0.06}
                />
                <rect x={x + 0.05} y={svgY + 0.05} width={0.4} height={0.12} fill={light} opacity={0.6} />
                <rect x={x + 0.05} y={svgY + 0.05} width={0.12} height={0.4} fill={light} opacity={0.6} />
              </g>
            );
          }

          return (
            <g key={idx} opacity={inBuffer ? 0.6 : 1}>
              <rect
                x={x} y={svgY} width={1} height={1}
                fill={color}
                stroke={dark}
                strokeWidth={0.06}
              />
              <rect x={x + 0.05} y={svgY + 0.05} width={0.4} height={0.12} fill={light} opacity={0.6} />
              <rect x={x + 0.05} y={svgY + 0.05} width={0.12} height={0.4} fill={light} opacity={0.6} />
            </g>
          );
        })}

        {/* Ghost piece */}
        {activePiece && ghostY != null && ghostY !== activePiece.y && (
          <ActivePieceCells
            piece={activePiece.piece}
            rotation={activePiece.rotation}
            x={activePiece.x}
            y={ghostY}
            visibleHeight={h}
            totalHeight={TOTAL_H}
            ghost
          />
        )}

        {/* Active piece */}
        {activePiece && (
          <ActivePieceCells
            piece={activePiece.piece}
            rotation={activePiece.rotation}
            x={activePiece.x}
            y={activePiece.y}
            visibleHeight={h}
            totalHeight={TOTAL_H}
          />
        )}
      </svg>
      {/* Border */}
      <div className="board-border" />
    </div>
  );
}

function ActivePieceCells({
  piece,
  rotation,
  x: px,
  y: py,
  visibleHeight,
  totalHeight,
  ghost,
}: {
  piece: Piece;
  rotation: Rotation;
  x: number;
  y: number;
  visibleHeight: number;
  totalHeight: number;
  ghost?: boolean;
}) {
  const cells = PIECE_CELLS[piece]![rotation]!;
  const color = PIECE_COLORS[piece];
  const light = PIECE_COLORS_LIGHT[piece];
  const dark = PIECE_COLORS_DARK[piece];

  return (
    <g>
      {cells.map((cell, i) => {
        const bx = px + cell.x;
        const by = py + cell.y;
        if (by < 0 || by >= totalHeight || bx < 0 || bx >= BOARD_WIDTH) return null;
        const svgY = visibleHeight - 1 - by;

        return (
          <g key={i}>
            <rect
              x={bx} y={svgY} width={1} height={1}
              fill={ghost ? 'transparent' : color}
              stroke={ghost ? color : dark}
              strokeWidth={ghost ? 0.08 : 0.06}
              opacity={ghost ? 0.3 : 1}
            />
            {!ghost && (
              <>
                <rect x={bx + 0.05} y={svgY + 0.05} width={0.4} height={0.12} fill={light} opacity={0.6} />
                <rect x={bx + 0.05} y={svgY + 0.05} width={0.12} height={0.4} fill={light} opacity={0.6} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
