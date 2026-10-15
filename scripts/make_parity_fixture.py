"""Write the fixture that checks the TypeScript rules against the Python ones.

Random games played with the Python rules, with the legal moves and the result after every
move. src/game/ultimate.test.ts replays them with the TypeScript rules, and
tests/test_parity_fixture.py fails if this file is out of date.

    uv run python scripts/make_parity_fixture.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import TypedDict

from pyplai_web.ultimate import UltimateTicTacToe

FIXTURE = Path(__file__).resolve().parent.parent / "src" / "game" / "ultimate.fixture.json"
GAMES = 40
SEED = 2026


class Step(TypedDict):
    legal: list[int]
    # 1 or 2 when won, 0 for a draw, None while the game is in progress
    winner: int | None


class Game(TypedDict):
    moves: list[int]
    # steps[i] is the position after moves[:i]
    steps: list[Step]


def build() -> list[Game]:
    rng = random.Random(SEED)
    games: list[Game] = []
    for _ in range(GAMES):
        state = UltimateTicTacToe()
        game = Game(moves=[], steps=[])
        while True:
            game["steps"].append(Step(legal=state.legal_moves(), winner=state.winner()))
            if state.winner() is not None:
                break
            move = rng.choice(state.legal_moves())
            game["moves"].append(move)
            state.apply(move)
        games.append(game)
    return games


def render(games: list[Game]) -> str:
    # One game per line keeps diffs readable without making the file huge
    return "[\n" + ",\n".join(json.dumps(g, separators=(",", ":")) for g in games) + "\n]\n"


if __name__ == "__main__":
    # LF on every platform, so the file does not change when generated on Windows
    FIXTURE.write_text(render(build()), encoding="utf-8", newline="\n")
    print(f"Wrote {GAMES} games to {FIXTURE}")
