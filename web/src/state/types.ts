import type { Piece, Placement, Rotation } from '@core/types';
import type { AnimationKeyframe } from '@web/engine/AnimationPlanner';
import type { ScoreState } from '@web/engine/scoring';

export type GamePhase =
  | 'START_SCREEN'
  | 'PICKING_FIRST'
  | 'PICKING_SECOND'
  | 'BOT_THINKING'
  | 'BOT_ANIMATING'
  | 'WAITING_FOR_PLAYER'
  | 'GAME_OVER';

export interface ViewState {
  phase: GamePhase;
  // Board data for rendering (10×20 visible cells)
  boardCells: (Piece | null)[];
  boardWidth: number;
  boardHeight: number;
  // Current/animating piece
  activePiece: {
    piece: Piece;
    rotation: Rotation;
    x: number;
    y: number;
  } | null;
  ghostY: number | null;
  // The bot's current piece (what it will play next)
  currentPiece: Piece | null;
  // Preview (next piece the bot sees)
  preview: Piece[];
  // Score
  scoreState: ScoreState;
  piecesPlaced: number;
  // Line clear flash
  clearingLines: number[] | null;
  // Game over flag
  gameOver: boolean;
}
