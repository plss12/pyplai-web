/**
 * Difficulty levels as MCTS iterations per move, not time: a level plays the same on a slow
 * phone as on a fast computer (docs/decisions/002-levels-by-iterations.md).
 *
 * PROVISIONAL: these numbers are a first guess from the speed measured on a desktop in Pyodide
 * (about 2,000 iterations per second). The calibration in calibration/ will replace them.
 */
export const LEVELS = ["easy", "medium", "hard", "impossible"] as const;
export type Level = (typeof LEVELS)[number];

export const ITERATIONS: Readonly<Record<Level, number>> = {
  easy: 25,
  medium: 200,
  hard: 1000,
  impossible: 4000,
};

/** The hint analyses the player's position as strongly as the hard level plays. */
export const HINT_ITERATIONS = ITERATIONS.hard;
