/**
 * Difficulty levels as MCTS iterations per move, not time: a level plays the same on a slow
 * phone as on a fast computer (docs/decisions/002-levels-by-iterations.md).
 *
 * Chosen from the calibration in calibration/results.csv (1,080 games): easy, medium and hard
 * are about 400 Elo apart, and impossible is 280 above hard (it beat 1,600 iterations in 86% of
 * their direct games). Impossible stays at 6,400 because it still takes only about 2 s per move
 * on a recent phone.
 */
export const LEVELS = ["easy", "medium", "hard", "impossible"] as const;
export type Level = (typeof LEVELS)[number];

export const ITERATIONS: Readonly<Record<Level, number>> = {
  easy: 25,
  medium: 200,
  hard: 1600,
  impossible: 6400,
};

/**
 * Iterations for a hint: as strong as the computer the player faces, so the hint is "what the
 * computer would play in your place" and never weaker than the opponent; but at least medium,
 * because 25 iterations would suggest nearly random moves.
 */
export const hintIterations = (level: Level): number => Math.max(ITERATIONS[level], ITERATIONS.medium);
