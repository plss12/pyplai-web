/**
 * What the interface needs to know about a game in progress, without touching the DOM: whose
 * turn it is, how it ended for the player, and how the arrow keys move across the board.
 */
import type { GameState, Move, Player } from "@/game/ultimate";

export type Result = "won" | "lost" | "draw";

export const computerToMove = (game: GameState, human: Player): boolean =>
  game.outcome === null && game.toMove !== human;

export function result(game: GameState, human: Player): Result | null {
  if (game.outcome === null) return null;
  if (game.outcome === 0) return "draw";
  return game.outcome === human ? "won" : "lost";
}

/** Row and column of a move on the 9x9 grid the player sees. */
export function gridPosition(move: Move): { row: number; col: number } {
  const board = Math.floor(move / 9);
  const cell = move % 9;
  return {
    row: Math.floor(board / 3) * 3 + Math.floor(cell / 3),
    col: (board % 3) * 3 + (cell % 3),
  };
}

export function moveAt(row: number, col: number): Move {
  const board = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const cell = (row % 3) * 3 + (col % 3);
  return board * 9 + cell;
}

const STEPS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * The cell an arrow key moves the focus to on the 9x9 grid, crossing between small boards and
 * stopping at the edges; Home and End jump to the start and end of the row. null for other keys.
 */
export function neighbour(move: Move, key: string): Move | null {
  const { row, col } = gridPosition(move);
  if (key === "Home") return moveAt(row, 0);
  if (key === "End") return moveAt(row, 8);
  const step = STEPS[key];
  if (!step) return null;
  const clamp = (n: number): number => Math.min(8, Math.max(0, n));
  return moveAt(clamp(row + step[0]), clamp(col + step[1]));
}

/**
 * The search's options, most visited first (ties: higher win rate first). This is the robust
 * child order of Browne et al. (2012, section 3.1): with few simulations, a move that won 2 of
 * 2 tries tops pyplAI's mean-reward ranking at 100%, though the search barely looked at it.
 */
export function byVisits<T extends { visits: number; value: number }>(moves: readonly T[]): T[] {
  return [...moves].sort((a, b) => b.visits - a.visits || b.value - a.value);
}
