const LINE_SCORES = [0, 40, 100, 300, 1200] as const;

export interface ScoreState {
  score: number;
  level: number;
  lines: number;
}

export function initialScore(): ScoreState {
  return { score: 0, level: 0, lines: 0 };
}

export function applyLineClears(state: ScoreState, linesCleared: number): ScoreState {
  if (linesCleared <= 0) return state;
  const points = (LINE_SCORES[Math.min(linesCleared, 4)] ?? 0) * (state.level + 1);
  const newLines = state.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10);
  return {
    score: state.score + points,
    level: newLevel,
    lines: newLines,
  };
}

export function getAnimationSpeed(level: number, baseSpeed: number): number {
  const factor = Math.max(0.15, 1 - level * 0.06);
  return Math.max(25, Math.floor(baseSpeed * factor));
}
