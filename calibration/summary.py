"""Summarise results.csv: score of every pairing and a rating for every player.

The rating is a Bradley-Terry model fitted with the minorization-maximization (MM) algorithm of
Hunter (2004), "MM algorithms for generalized Bradley-Terry models", Annals of Statistics
32(1), section 3. A draw counts as half a win for each side. Every pairing also gets one virtual
draw, a light prior that keeps the ratings finite when a player never scores (random play
against strong searches). Ratings are on the Elo scale (400 log10 of strength), with random
play at 0.

Each MM sweep costs O(P) for P pairings, and the fit runs a fixed number of sweeps: O(sweeps * P)
time and O(N + P) space for N players.

    uv run python calibration/summary.py                          # the level calibration
    uv run python calibration/summary.py calibration/selection.csv  # mean against visits
"""

from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from pathlib import Path

RESULTS = Path(__file__).resolve().parent / "results.csv"


def wilson(successes: float, n: int, z: float = 1.96) -> tuple[float, float]:
    """95% Wilson score interval for a proportion."""
    if n == 0:
        return (0.0, 1.0)
    p = successes / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return (max(0.0, centre - half), min(1.0, centre + half))


def bradley_terry(
    scores: dict[tuple[str, str], tuple[float, int]], sweeps: int = 2000
) -> dict[str, float]:
    """Elo-scale ratings from {(i, j): (points of i against j, games)}, random play at 0."""
    players = sorted({p for pair in scores for p in pair})
    wins: dict[str, float] = defaultdict(float)
    games: dict[tuple[str, str], float] = {}
    for (i, j), (points, n) in scores.items():
        # One virtual draw per pairing: half a point each, one more game
        wins[i] += points + 0.5
        wins[j] += n - points + 0.5
        games[(i, j)] = n + 1
    strength = dict.fromkeys(players, 1.0)
    for _ in range(sweeps):
        for p in players:
            denominator = sum(
                n / (strength[i] + strength[j]) for (i, j), n in games.items() if p in (i, j)
            )
            strength[p] = wins[p] / denominator
        # The model only fixes ratios: renormalise so random play stays at 1
        anchor = strength.get("random", 1.0)
        strength = {p: s / anchor for p, s in strength.items()}
    return {p: 400 * math.log10(s) for p, s in strength.items()}


def order(player: str) -> tuple[int, int]:
    # random first, then by iterations; a "v" (by visits) player right after its "mean" twin
    if player == "random":
        return (-1, 0)
    return (int(player.removesuffix("v")), int(player.endswith("v")))


def main() -> None:
    # An optional path summarises another tournament, such as selection.csv
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else RESULTS
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    tally: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0, 0])
    seconds: dict[tuple[str, str], list[float]] = defaultdict(list)
    for r in rows:
        key = (r["a"], r["b"])
        tally[key][{"a": 0, "draw": 1, "b": 2}[r["winner"]]] += 1
        seconds[key].append(float(r["seconds"]))

    print("| Weaker (a) | Stronger (b) | Games | b wins | Draws | a wins | b score [95% CI] |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    scores: dict[tuple[str, str], tuple[float, int]] = {}
    for (a, b), (a_wins, draws, b_wins) in sorted(
        tally.items(), key=lambda kv: (order(kv[0][1]), order(kv[0][0]))
    ):
        n = a_wins + draws + b_wins
        b_points = b_wins + draws / 2
        low, high = wilson(b_points, n)
        scores[(a, b)] = (a_wins + draws / 2, n)
        score = f"{b_points / n:.0%} [{low:.0%}-{high:.0%}]"
        print(f"| {a} | {b} | {n} | {b_wins} | {draws} | {a_wins} | {score} |")

    print("\n| Player | Rating (Elo scale, random = 0) |")
    print("| --- | --- |")
    for player, rating in sorted(bradley_terry(scores).items(), key=lambda kv: order(kv[0])):
        print(f"| {player} | {rating:.0f} |")


if __name__ == "__main__":
    main()
