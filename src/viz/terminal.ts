import { PIECE_CELLS } from '../core/constants.js';
import { Piece, Rotation, type GameSnapshot } from '../core/types.js';

// ANSI color codes for each piece type (Guideline colors)
const PIECE_COLORS: Record<Piece, string> = {
  [Piece.I]: '\x1b[36m', // cyan
  [Piece.O]: '\x1b[33m', // yellow
  [Piece.T]: '\x1b[35m', // magenta
  [Piece.S]: '\x1b[32m', // green
  [Piece.Z]: '\x1b[31m', // red
  [Piece.J]: '\x1b[34m', // blue
  [Piece.L]: '\x1b[38;5;208m', // orange (256-color)
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const BLOCK = '\u2588\u2588'; // two full-block chars for square aspect ratio
const EMPTY = '  ';
const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function renderMiniPiece(piece: Piece | null): string[] {
  if (piece === null) return ['      ', '      ', '      '];
  const cells = PIECE_CELLS[piece]![Rotation.R0]!;
  const color = PIECE_COLORS[piece];
  const grid = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => false));
  for (const c of cells) {
    if (c.y < 3 && c.x < 4) grid[c.y]![c.x] = true;
  }
  // Render bottom to top (y=2 is top)
  const lines: string[] = [];
  for (let y = 2; y >= 0; y--) {
    let line = '';
    for (let x = 0; x < 4; x++) {
      line += grid[y]![x] ? `${color}${BLOCK}${RESET}` : EMPTY;
    }
    lines.push(line);
  }
  return lines;
}

export interface RenderStats {
  linesCleared: number;
  piecesPlaced: number;
  elapsedMs: number;
  msPerDecision: number;
}

export class TerminalRenderer {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    // Hide cursor
    process.stdout.write('\x1b[?25l');
    // Clear screen
    process.stdout.write('\x1b[2J');
    // Set up cleanup on exit
    const cleanup = () => {
      process.stdout.write('\x1b[?25h'); // show cursor
      process.stdout.write(RESET);
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
  }

  render(snapshot: GameSnapshot, stats: RenderStats): void {
    this.init();

    const { board, currentPiece, holdPiece, preview } = snapshot;
    const visibleHeight = 20;
    const w = board.width;

    // Move cursor to top-left
    let output = '\x1b[H';

    // Title
    output += `${BOLD}  TETRIS AUTOPLAYER${RESET}\n\n`;

    // Render board with side panels
    const holdLines = renderMiniPiece(holdPiece);
    const previewPieces = preview.slice(0, 5);

    for (let row = visibleHeight - 1; row >= 0; row--) {
      // Board
      output += '  \x1b[90m\u2502\x1b[0m';
      for (let x = 0; x < w; x++) {
        if (board.get(x, row)) {
          // Determine color based on the cell (we don't track which piece placed it,
          // so use a neutral color for locked cells)
          output += '\x1b[37m' + BLOCK + RESET;
        } else {
          output += DIM + '\x1b[90m\u00b7 ' + RESET;
        }
      }
      output += '\x1b[90m\u2502\x1b[0m';

      // Side panel
      const sideRow = visibleHeight - 1 - row;
      if (sideRow === 0) {
        output += `  ${BOLD}HOLD${RESET}`;
      } else if (sideRow >= 1 && sideRow <= 3) {
        output += '  ' + holdLines[sideRow - 1]!;
      } else if (sideRow === 5) {
        output += `  ${BOLD}NEXT${RESET}`;
      } else if (sideRow >= 6) {
        const previewIdx = Math.floor((sideRow - 6) / 4);
        const previewRow = (sideRow - 6) % 4;
        if (previewIdx < previewPieces.length && previewRow < 3) {
          const miniLines = renderMiniPiece(previewPieces[previewIdx]!);
          output += '  ' + miniLines[previewRow]!;
        }
      }

      output += '\n';
    }

    // Bottom border
    output += '  \x1b[90m\u2514' + '\u2500\u2500'.repeat(w) + '\u2518\x1b[0m\n';

    // Stats
    output += '\n';
    output += `  ${BOLD}Lines:${RESET}  ${stats.linesCleared.toLocaleString()}\n`;
    output += `  ${BOLD}Pieces:${RESET} ${stats.piecesPlaced.toLocaleString()}\n`;
    output += `  ${BOLD}Speed:${RESET}  ${stats.msPerDecision.toFixed(1)}ms/move\n`;
    output += `  ${BOLD}Time:${RESET}   ${formatTime(stats.elapsedMs)}\n`;
    output += `  ${BOLD}Current:${RESET} ${PIECE_NAMES[currentPiece]}  `;

    // Clear any remaining lines from previous frame
    output += '\x1b[J';

    process.stdout.write(output);
  }

  clear(): void {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('\x1b[?25h');
  }
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m ${secs % 60}s`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}
