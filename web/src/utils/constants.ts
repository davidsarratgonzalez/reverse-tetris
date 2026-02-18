export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BUFFER_ROWS = 4;
/** How many buffer rows to render above the playfield */
export const VISIBLE_BUFFER = BUFFER_ROWS;
export const TOTAL_RENDER_HEIGHT = BOARD_HEIGHT + VISIBLE_BUFFER;
export const CELL_SIZE = 28;
export const PREVIEW_CELL_SIZE = 20;
export const SELECTOR_CELL_SIZE = 24;

// Animation timing per move type (ms) at speed 1x
export const MOVE_DELAY = 60;    // horizontal move
export const ROTATE_DELAY = 80;  // rotation
export const DROP_DELAY = 35;    // soft drop (1 cell)
export const LOCK_DELAY = 200;   // pause before locking
export const LINE_FLASH_DELAY = 300;    // white flash on full rows
export const LINE_COLLAPSE_DELAY = 250; // rows dropping down
