import { Piece } from '@core/types';

/** NES-style piece colors */
export const PIECE_COLORS: Record<Piece, string> = {
  [Piece.I]: '#00f0f0', // cyan
  [Piece.O]: '#f0f000', // yellow
  [Piece.T]: '#a000f0', // purple
  [Piece.S]: '#00f000', // green
  [Piece.Z]: '#f00000', // red
  [Piece.J]: '#0000f0', // blue
  [Piece.L]: '#f0a000', // orange
};

export const PIECE_COLORS_LIGHT: Record<Piece, string> = {
  [Piece.I]: '#66ffff',
  [Piece.O]: '#ffff66',
  [Piece.T]: '#cc66ff',
  [Piece.S]: '#66ff66',
  [Piece.Z]: '#ff6666',
  [Piece.J]: '#6666ff',
  [Piece.L]: '#ffcc66',
};

export const PIECE_COLORS_DARK: Record<Piece, string> = {
  [Piece.I]: '#009090',
  [Piece.O]: '#909000',
  [Piece.T]: '#600090',
  [Piece.S]: '#009000',
  [Piece.Z]: '#900000',
  [Piece.J]: '#000090',
  [Piece.L]: '#906000',
};

export const PIECE_NAMES: Record<Piece, string> = {
  [Piece.I]: 'I',
  [Piece.O]: 'O',
  [Piece.T]: 'T',
  [Piece.S]: 'S',
  [Piece.Z]: 'Z',
  [Piece.J]: 'J',
  [Piece.L]: 'L',
};
