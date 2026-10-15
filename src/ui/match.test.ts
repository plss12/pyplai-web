import { describe, expect, it } from "vitest";
import { fromMoves, newGame } from "@/game/ultimate";
import { describeMove } from "@/i18n";
import { byVisits, computerToMove, gridPosition, moveAt, neighbour, result } from "./match";

describe("grid positions", () => {
  it("maps every move to a distinct cell of the 9x9 grid and back", () => {
    const seen = new Set<string>();
    for (let move = 0; move < 81; move++) {
      const { row, col } = gridPosition(move);
      seen.add(`${row},${col}`);
      expect(moveAt(row, col)).toBe(move);
    }
    expect(seen.size).toBe(81);
  });

  it("places the centre board's top-right cell where the player sees it", () => {
    // Board 4 (centre), cell 2 (top right): row 3, column 5
    expect(gridPosition(4 * 9 + 2)).toEqual({ row: 3, col: 5 });
  });
});

describe("arrow keys", () => {
  it("cross from one small board into the next", () => {
    // Top-right cell of the top-left board, then right: top-left cell of the top board
    expect(neighbour(2, "ArrowRight")).toBe(9);
  });

  it("stop at the edges of the big board", () => {
    expect(neighbour(0, "ArrowUp")).toBe(0);
    expect(neighbour(80, "ArrowRight")).toBe(80);
  });

  it("jump to the ends of the row with Home and End", () => {
    expect(neighbour(40, "Home")).toBe(moveAt(4, 0));
    expect(neighbour(40, "End")).toBe(moveAt(4, 8));
  });

  it("ignore other keys", () => {
    expect(neighbour(40, "Enter")).toBeNull();
  });
});

describe("turns and results", () => {
  it("knows when the computer moves", () => {
    expect(computerToMove(newGame(), 1)).toBe(false);
    expect(computerToMove(newGame(), 2)).toBe(true);
  });

  it("reports the result from the player's side", () => {
    // Shortest win for player 1 found by the Python rules (see ultimate.test.ts)
    const game = fromMoves([
      77, 53, 75, 32, 48, 29, 26, 72, 6, 54, 0, 5, 47, 18, 1, 9, 3, 35, 76, 40, 38, 22, 41, 50, 46,
      13, 44,
    ]);
    expect(result(game, 1)).toBe("won");
    expect(result(game, 2)).toBe("lost");
    expect(computerToMove(game, 2)).toBe(false);
    expect(result(newGame(), 1)).toBeNull();
  });
});

describe("move descriptions", () => {
  it("name the board and the cell in both languages", () => {
    expect(describeMove("es", 4 * 9 + 2)).toBe("tablero central, casilla superior derecha");
    expect(describeMove("en", 4 * 9 + 2)).toBe("centre board, top right cell");
  });
});

describe("options by visits", () => {
  it("put a well-explored move above a lucky one", () => {
    const lucky = { move: 1, visits: 2, value: 1 };
    const explored = { move: 2, visits: 40, value: 0.6 };
    const tied = { move: 3, visits: 40, value: 0.55 };
    expect(byVisits([lucky, tied, explored]).map((m) => m.move)).toEqual([2, 3, 1]);
  });
});
