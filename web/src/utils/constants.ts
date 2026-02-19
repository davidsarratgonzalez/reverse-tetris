export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
/** Guideline: 20 buffer rows above visible area (internal board = 40 rows) */
export const BUFFER_ROWS = 20;
/** How many buffer rows to render above the playfield border (spawn area) */
export const VISIBLE_BUFFER = 3;
export const TOTAL_RENDER_HEIGHT = BOARD_HEIGHT + VISIBLE_BUFFER;
// Animation timing per move type (ms) at speed 1x
export const SPAWN_DELAY = 150;  // pause at spawn position (visible in buffer)
export const MOVE_DELAY = 60;    // horizontal move
export const ROTATE_DELAY = 80;  // rotation
export const DROP_DELAY = 35;    // soft drop (1 cell)
export const LOCK_DELAY = 200;   // pause before locking
export const LINE_FLASH_DELAY = 300;    // white flash on full rows
export const LINE_COLLAPSE_DELAY = 250; // rows dropping down
