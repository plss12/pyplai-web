import { describe, expect, it } from "vitest";
import fixture from "./ultimate.fixture.json";
import { DRAWN, activeBoards, fromMoves, legalMoves, newGame, play } from "./ultimate";

interface FixtureGame {
  moves: number[];
  steps: { legal: number[]; winner: 0 | 1 | 2 | null }[];
}

describe("parity with the Python rules", () => {
  // Games played by python/pyplai_web/ultimate.py (scripts/make_parity_fixture.py)
  const games = fixture as FixtureGame[];

  it("covers wins for both players and draws", () => {
    const results = new Set(games.map((g) => g.steps.at(-1)?.winner));
    expect(results).toEqual(new Set([0, 1, 2]));
  });

  it.each(games.map((game, i) => [i, game] as const))("game %i", (_, game) => {
    let state = newGame();
    game.steps.forEach((step, i) => {
      expect(legalMoves(state)).toEqual(step.legal);
      expect(state.outcome).toEqual(step.winner);
      const move = game.moves[i];
      if (move !== undefined) state = play(state, move);
    });
  });
});

describe("rules", () => {
  it("sends the opponent to the board matching the cell", () => {
    expect(activeBoards(play(newGame(), 4 * 9 + 2))).toEqual(new Set([2]));
  });

  it("closes a full board without winner as drawn and frees a player sent to it", () => {
    // Board 0 has no line and one empty cell left; whoever fills it makes no line either
    const cells = Array<number>(81).fill(0);
    [1, 2, 1, 1, 2, 2, 2, 1].forEach((player, cell) => (cells[cell] = player));
    const state = { ...newGame(), cells, target: 0 };
    const closed = play(state, 8);
    expect(closed.main[0]).toBe(DRAWN);
    expect(activeBoards(closed)).toEqual(new Set([8]));
    // Cell 0 of board 8 sends the opponent to the closed board 0: any open board is allowed
    const freed = play(closed, 8 * 9 + 0);
    expect(activeBoards(freed)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(freed.outcome).toBeNull();
  });

  it("replays a game and ends it when a player wins three boards in a row", () => {
    // The shortest win for player 1 in 20,000 random games played by the Python rules
    const moves = [
      77, 53, 75, 32, 48, 29, 26, 72, 6, 54, 0, 5, 47, 18, 1, 9, 3, 35, 76, 40, 38, 22, 41, 50, 46,
      13, 44,
    ];
    expect(fromMoves(moves.slice(0, -1)).outcome).toBeNull();
    const state = fromMoves(moves);
    expect(state.outcome).toBe(1);
    expect(legalMoves(state)).toEqual([]);
  });

  it("rejects an illegal move and keeps the state unchanged", () => {
    const state = play(newGame(), 40);
    expect(() => play(state, 40)).toThrow("not legal");
    expect(state.moves).toEqual([40]);
  });
});
