import type { Piece, Placement, Rotation } from '@core/types';
import type { GameMode } from '@core/mode';
import type { AnimationKeyframe, BotInput } from '@web/engine/AnimationPlanner';
import type { ScoreState } from '@web/engine/scoring';

export type GamePhase =
  | 'START_SCREEN'
  | 'PICKING'
  | 'BOT_THINKING'
  | 'BOT_ANIMATING'
  | 'LINE_CLEARING'
  | 'WAITING_FOR_PLAYER'
  | 'GAME_OVER';

export interface ViewState {
  phase: GamePhase;
  // Mode
  mode: GameMode | null;
  // Board data for rendering
  boardCells: (Piece | null)[];
  boardWidth: number;
  boardHeight: number;
  // Picking phase
  picksRemaining: number;
  // Current/animating piece
  activePiece: {
    piece: Piece;
    rotation: Rotation;
    x: number;
    y: number;
  } | null;
  ghostY: number | null;
  showGhost: boolean;
  visibleBuffer: number;
  // The bot's current piece (what it will play next)
  currentPiece: Piece | null;
  // Preview (next piece the bot sees)
  preview: Piece[];
  // Hold piece (modern mode)
  holdPiece: Piece | null;
  // Score
  scoreState: ScoreState;
  piecesPlaced: number;
  // Line clear animation: flash phase (row indices that are full)
  clearingLines: number[] | null;
  // Line clear animation: collapse phase (per-row shift distances)
  collapseShifts: number[] | null;
  // Bot input display (what "button" the bot is pressing)
  activeInput: BotInput;
  // Game over flag
  gameOver: boolean;
}
