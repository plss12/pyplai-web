/**
 * Ultimate tic-tac-toe rules for the interface, so legal moves show at once, even while
 * Pyodide is still loading. The search uses the Python rules in python/pyplai_web/ultimate.py:
 * both must agree, which ultimate.test.ts checks against games played by the Python rules.
 *
 * A move is a number from 0 to 80: board * 9 + cell, both numbered 0-8 in reading order.
 */

export type Player = 1 | 2;
export type Move = number;
/** 1 or 2 when the game is won, 0 for a draw, null while it is in progress. */
export type Outcome = Player | 0 | null;

/** Value of a closed small board on the big board when it filled up with no winner. */
export const DRAWN = 3;

const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface GameState {
  /** cells[board * 9 + cell]: 0 when empty, otherwise the player who played there. */
  readonly cells: readonly number[];
  /** main[board]: 0 open, 1 or 2 won by that player, DRAWN closed with no winner. */
  readonly main: readonly number[];
  /** Board the player to move is sent to, or null to play anywhere. */
  readonly target: number | null;
  readonly toMove: Player;
  readonly outcome: Outcome;
  /** Every move played, from the start: what the engine replays. */
  readonly moves: readonly Move[];
}

const hasLine = (values: readonly number[], player: Player, offset = 0): boolean =>
  LINES.some((line) => line.every((i) => values[offset + i] === player));

export function newGame(): GameState {
  return {
    cells: Array<number>(81).fill(0),
    main: Array<number>(9).fill(0),
    target: null,
    toMove: 1,
    outcome: null,
    moves: [],
  };
}

/** Moves for the player to move, in increasing order. Empty when the game is over. */
export function legalMoves(state: GameState): Move[] {
  const { cells, main, target, outcome } = state;
  if (outcome !== null) return [];
  const boards = target !== null && main[target] === 0 ? [target] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const moves: Move[] = [];
  for (const board of boards) {
    if (main[board] !== 0) continue;
    for (let cell = 0; cell < 9; cell++) {
      if (cells[board * 9 + cell] === 0) moves.push(board * 9 + cell);
    }
  }
  return moves;
}

/** Boards where the player to move may play: the ones to highlight. */
export function activeBoards(state: GameState): Set<number> {
  return new Set(legalMoves(state).map((move) => Math.floor(move / 9)));
}

/**
 * The state after playing a move.
 *
 * @throws Error if the move is not legal.
 */
export function play(state: GameState, move: Move): GameState {
  if (!legalMoves(state).includes(move)) {
    throw new Error(`Move ${move} is not legal in this position`);
  }
  const board = Math.floor(move / 9);
  const cell = move % 9;
  const player = state.toMove;
  const cells = [...state.cells];
  const main = [...state.main];
  cells[move] = player;
  let won = false;
  if (hasLine(cells, player, board * 9)) {
    main[board] = player;
    won = hasLine(main, player);
  } else if (cells.slice(board * 9, board * 9 + 9).every((c) => c !== 0)) {
    main[board] = DRAWN;
  }
  const next: GameState = {
    cells,
    main,
    target: cell,
    toMove: player === 1 ? 2 : 1,
    outcome: won ? player : null,
    moves: [...state.moves, move],
  };
  return won || legalMoves(next).length > 0 ? next : { ...next, outcome: 0 };
}

/**
 * Replay a game from the start.
 *
 * @throws Error on the first illegal move.
 */
export function fromMoves(moves: readonly Move[]): GameState {
  return moves.reduce(play, newGame());
}
