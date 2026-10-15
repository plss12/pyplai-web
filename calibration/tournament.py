"""Play MCTS with different iteration counts against each other to calibrate the levels.

Each player is pyplAI's MCTS with a fixed number of iterations per move, run through
``pyplai_web.engine.analyse`` (the code the site runs), or ``random``. Every player meets the
next two rungs of the ladder (x2 and x4 its iterations) and random play. Game ``g`` of a pairing
gives the first move to the weaker player when ``g`` is even, and both searches take seeds
derived from ``g``, so every game can be replayed.

A player name with a "v" suffix (such as "200v") picks its move by visits instead of mean reward
(see Selection in pyplai_web/engine.py). --selection-match plays every level's iteration count
against its "v" version instead of the ladder, to compare the two ways of choosing.

Results are appended to a CSV, one row per game; a stopped run resumes where it left off.
See summary.py for the analysis.

    uv run python calibration/tournament.py                    # full run, all cores
    uv run python calibration/tournament.py --games 2 --ladder 10 25 --workers 1   # quick test
    uv run python calibration/tournament.py --selection-match  # mean against visits
"""

from __future__ import annotations

import argparse
import csv
import os
import random
import time
from collections.abc import Iterator
from multiprocessing import Pool
from pathlib import Path
from typing import TypedDict

from pyplai_web.engine import analyse
from pyplai_web.ultimate import UltimateTicTacToe

RESULTS = Path(__file__).resolve().parent / "results.csv"
SELECTION_RESULTS = Path(__file__).resolve().parent / "selection.csv"
# The iteration counts of the site's levels (src/engine/levels.ts)
LEVEL_ITERATIONS = [25, 200, 1600, 6400]
LADDER = [10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400]
COLUMNS = ["a", "b", "game", "first", "winner", "moves", "seconds"]


class Row(TypedDict):
    a: str
    b: str
    game: int
    # "a" or "b": who moved first
    first: str
    # "a", "b" or "draw"
    winner: str
    moves: int
    seconds: float


Task = tuple[str, str, int]


def iterations(player: str) -> int:
    return int(player.removesuffix("v"))


def choose(player: str, moves: list[int], state: UltimateTicTacToe, seed: int) -> int:
    if player == "random":
        return random.Random(seed).choice(state.legal_moves())
    selection = "visits" if player.endswith("v") else "mean"
    return analyse(moves, iterations(player), seed, selection)["best"]


def play(task: Task) -> Row:
    a, b, game = task
    first, second = (a, b) if game % 2 == 0 else (b, a)
    started = time.perf_counter()
    state = UltimateTicTacToe()
    moves: list[int] = []
    while state.winner() is None:
        player = first if state.jugadorActual == 1 else second
        # A different seed for every game, move and side, reproducible from the game number
        seed = (game * 1000 + len(moves)) * 2 + state.jugadorActual
        move = choose(player, moves, state, seed)
        moves.append(move)
        state.apply(move)
    winner_side = state.winner()
    if winner_side is None:
        raise RuntimeError("The game loop ended before the game did")
    winner = "draw" if winner_side == 0 else ("a" if (first, second)[winner_side - 1] == a else "b")
    return Row(
        a=a,
        b=b,
        game=game,
        first="a" if first == a else "b",
        winner=winner,
        moves=len(moves),
        seconds=round(time.perf_counter() - started, 2),
    )


def pairings(ladder: list[int]) -> Iterator[tuple[str, str]]:
    for i, n in enumerate(ladder):
        yield "random", str(n)
        for step in (1, 2):
            if i + step < len(ladder):
                yield str(n), str(ladder[i + step])


def selection_pairings(levels: list[int]) -> Iterator[tuple[str, str]]:
    for n in levels:
        yield str(n), f"{n}v"


def done_tasks(path: Path) -> set[Task]:
    if not path.exists():
        return set()
    with path.open(encoding="utf-8", newline="") as f:
        return {(r["a"], r["b"], int(r["game"])) for r in csv.DictReader(f)}


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--ladder", type=int, nargs="+", default=LADDER)
    parser.add_argument("--games", type=int, default=40, help="Games per pairing (even).")
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 1)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument(
        "--selection-match",
        action="store_true",
        help="Play each level's iterations by mean against the same by visits.",
    )
    args = parser.parse_args()
    if args.output is None:
        args.output = SELECTION_RESULTS if args.selection_match else RESULTS
    chosen = selection_pairings(LEVEL_ITERATIONS) if args.selection_match else pairings(args.ladder)

    done = done_tasks(args.output)
    tasks = [(a, b, g) for a, b in chosen for g in range(args.games) if (a, b, g) not in done]
    # Longest games first, so the run does not end waiting on one slow worker
    tasks.sort(key=lambda t: -sum(iterations(p) for p in t[:2] if p != "random"))
    new_file = not args.output.exists()
    print(f"{len(tasks)} games to play ({len(done)} already done) on {args.workers} processes")
    with args.output.open("a", encoding="utf-8", newline="") as f, Pool(args.workers) as pool:
        writer = csv.DictWriter(f, COLUMNS, lineterminator="\n")
        if new_file:
            writer.writeheader()
        for i, row in enumerate(pool.imap_unordered(play, tasks), start=1):
            writer.writerow(row)
            f.flush()
            print(
                f"[{i}/{len(tasks)}] {row['a']} vs {row['b']} game {row['game']}: {row['winner']}",
                flush=True,
            )


if __name__ == "__main__":
    main()
