import json
import random

import pytest

from pyplai_web.engine import analyse, analyse_json
from pyplai_web.ultimate import UltimateTicTacToe


def test_analysis_ranks_every_legal_move_and_runs_the_requested_iterations() -> None:
    result = analyse([40], iterations=200, seed=1)
    legal = UltimateTicTacToe.from_moves([40]).legal_moves()
    assert sorted(e["move"] for e in result["moves"]) == legal
    assert result["best"] == result["moves"][0]["move"]
    assert result["iterations"] == 200
    assert all(0 <= e["value"] <= 1 for e in result["moves"])


def test_visits_selection_picks_and_ranks_by_visits() -> None:
    result = analyse([], 300, seed=2, selection="visits")
    visits = [e["visits"] for e in result["moves"]]
    assert visits == sorted(visits, reverse=True)
    assert result["best"] == result["moves"][0]["move"]


def test_a_seed_makes_the_analysis_reproducible() -> None:
    assert analyse([], 150, seed=7)["moves"] == analyse([], 150, seed=7)["moves"]


def test_the_search_takes_a_winning_move() -> None:
    # Find, by random play, a position where the player to move can win the game at once
    rng = random.Random(3)
    while True:
        moves: list[int] = []
        state = UltimateTicTacToe()
        while state.winner() is None:
            winning = [
                m
                for m in state.legal_moves()
                if UltimateTicTacToe.from_moves([*moves, m]).winner() == state.jugadorActual
            ]
            if winning:
                assert analyse(moves, 2000, seed=0)["best"] in winning
                return
            m = rng.choice(state.legal_moves())
            moves.append(m)
            state.apply(m)


@pytest.mark.parametrize(
    ("moves", "iterations", "message"),
    [
        ([40, 40], 10, "not legal"),
        ([], 0, "at least 1"),
    ],
)
def test_bad_requests_raise(moves: list[int], iterations: int, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        analyse(moves, iterations)


def test_the_json_boundary_round_trips() -> None:
    reply = json.loads(analyse_json('{"moves": [40], "iterations": 50, "seed": 3}'))
    direct = analyse([40], 50, seed=3)
    assert {k: v for k, v in reply.items() if k != "seconds"} == {
        k: v for k, v in direct.items() if k != "seconds"
    }


@pytest.mark.parametrize(
    "request_",
    [
        '{"moves": [40], "iterations": 50}',
        '{"moves": ["40"], "iterations": 50, "seed": null}',
        '{"moves": [40], "iterations": "50", "seed": null}',
        '{"moves": [true], "iterations": 50, "seed": null}',
        "[]",
    ],
)
def test_the_json_boundary_rejects_malformed_requests(request_: str) -> None:
    with pytest.raises(ValueError):
        analyse_json(request_)


def test_a_finished_game_cannot_be_analysed() -> None:
    rng = random.Random(0)
    moves: list[int] = []
    state = UltimateTicTacToe()
    while state.winner() is None:
        m = rng.choice(state.legal_moves())
        moves.append(m)
        state.apply(m)
    with pytest.raises(ValueError, match="over"):
        analyse(moves, 10)
