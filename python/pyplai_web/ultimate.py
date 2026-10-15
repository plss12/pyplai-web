"""Ultimate tic-tac-toe rules in the shape pyplAI's searches expect.

Adapted from pyplAI-MCP (src/pyplai_mcp/games/ultimate.py), without its text interface. The
TypeScript rules in src/game/ultimate.ts must match these: tests/test_parity_fixture.py writes
the fixture that src/game/ultimate.test.ts checks them against.

A move is an int from 0 to 80: board * 9 + cell, both numbered 0-8 in reading order.
"""

from __future__ import annotations

from typing import Self

# The eight lines of a 3x3 grid, as flat indexes
LINES = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)
# Value of a closed small board on the big board when it filled up with no winner
DRAWN = 3


def _has_line(values: list[int], player: int) -> bool:
    return any(all(values[i] == player for i in line) for line in LINES)


class UltimateTicTacToe:
    """A mutable game state. pyplAI receives the unbound methods and reads ``jugadorActual``."""

    def __init__(self) -> None:
        # Player to move (1 or 2). pyplAI requires this exact attribute name.
        self.jugadorActual = 1
        # cells[b][c]: cell c of small board b, 0 when empty
        self.cells = [[0] * 9 for _ in range(9)]
        # main[b]: 0 open, 1 or 2 won by that player, DRAWN closed with no winner
        self.main = [0] * 9
        # Board the player to move is sent to, or None to play anywhere
        self.target: int | None = None
        # Winner of the game (1 or 2), or 0. The search asks for it several times per simulated
        # move and scanning the big board each time was most of the search time, but it can only
        # change when apply closes a small board, so apply keeps it up to date. Anything that
        # writes to main without apply must update it too.
        self.won = 0

    @classmethod
    def from_moves(cls, moves: list[int]) -> Self:
        """Replay a game from the start. Raises ValueError on the first illegal move."""
        state = cls()
        for number, move in enumerate(moves, start=1):
            if move not in state.legal_moves():
                raise ValueError(f"Move {number} ({move}) is not legal in that position")
            state.apply(move)
        return state

    def legal_moves(self) -> list[int]:
        """Moves for the player to move, in increasing order. Empty when the game is over."""
        if self.won:
            return []
        target = self.target
        boards = [target] if target is not None and self.main[target] == 0 else range(9)
        return [
            b * 9 + c
            for b in boards
            if self.main[b] == 0
            for c in range(9)
            if self.cells[b][c] == 0
        ]

    def apply(self, move: int) -> Self:
        """Play a legal move in place and return the state, as pyplAI expects."""
        board, cell = divmod(move, 9)
        player = self.jugadorActual
        self.cells[board][cell] = player
        if _has_line(self.cells[board], player):
            self.main[board] = player
            if _has_line(self.main, player):
                self.won = player
        elif all(self.cells[board]):
            self.main[board] = DRAWN
        self.target = cell
        self.jugadorActual = 3 - player
        return self

    def is_winner(self, player: int) -> bool:
        return self.won == player

    def is_terminal(self) -> bool:
        return self.won != 0 or not self.legal_moves()

    def winner(self) -> int | None:
        """1 or 2 when the game is won, 0 for a draw and None while it is in progress."""
        if self.won:
            return self.won
        return 0 if not self.legal_moves() else None
