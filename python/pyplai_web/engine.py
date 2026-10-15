"""What the web worker calls: replay a game and rank the moves of the player to move with MCTS."""

from __future__ import annotations

import json
from typing import TypedDict, TypeGuard, cast

import pyplAI

from .ultimate import UltimateTicTacToe


class MoveEvaluation(TypedDict):
    move: int
    visits: int
    # Mean reward of the player to move after this move, from 0 to 1 (draws count as half)
    value: float


class Analysis(TypedDict):
    best: int
    moves: list[MoveEvaluation]
    iterations: int
    seconds: float


def analyse(moves: list[int], iterations: int, seed: int | None = None) -> Analysis:
    """Rank the legal moves of the position reached by ``moves`` with pyplAI's MCTS.

    The search is bounded by iterations rather than time, so a difficulty level plays the same
    on a slow phone as on a fast computer.

    Args:
        moves: The moves played so far, from the start of the game.
        iterations: MCTS iterations to run (at least 1).
        seed: Seed for the search, to make it reproducible. None draws a fresh one.

    Returns:
        The chosen move and every legal move ranked best first, as pyplAI ranks them (mean
        reward), with the iterations run and the search time in seconds.

    Raises:
        ValueError: If a move is illegal, the game is over or iterations is below 1.
    """
    if iterations < 1:
        raise ValueError("iterations must be at least 1")
    state = UltimateTicTacToe.from_moves(moves)
    if state.winner() is not None:
        raise ValueError("The game is over")
    g = UltimateTicTacToe
    # The time limit (1.0) is ignored when iteraciones is given
    search = pyplAI.MCTS(
        g.apply,
        g.legal_moves,
        g.is_terminal,
        g.is_winner,
        2,
        1.0,
        iteraciones=iterations,
        semilla=seed,
    )
    result = search.analiza(state)
    return Analysis(
        best=result.movimiento,
        moves=[
            MoveEvaluation(move=e.movimiento, visits=e.visitas, value=e.valor)
            for e in result.movimientos
        ],
        iterations=result.iteraciones,
        seconds=result.tiempo,
    )


def analyse_json(request: str) -> str:
    """``analyse`` with JSON in and out, the boundary with the web worker.

    JSON keeps the worker independent of how Pyodide converts JavaScript objects; the worker
    validates the reply with a schema.

    Args:
        request: ``{"moves": [...], "iterations": n, "seed": n | null}``.

    Returns:
        The Analysis as JSON.

    Raises:
        ValueError: If the request is malformed or ``analyse`` rejects it.
    """
    data: object = json.loads(request)
    if not isinstance(data, dict):
        raise ValueError(f"Malformed analysis request: {request}")
    # JSON object keys are always strings; the values are checked one by one below
    fields = cast("dict[str, object]", data)
    if set(fields) != {"moves", "iterations", "seed"}:
        raise ValueError(f"Malformed analysis request: {request}")
    moves, iterations, seed = fields["moves"], fields["iterations"], fields["seed"]
    if not isinstance(moves, list):
        raise ValueError(f"Moves must be a list of integers: {request}")
    items = cast("list[object]", moves)
    checked = [m for m in items if _is_int(m)]
    if len(checked) != len(items) or not _is_int(iterations):
        raise ValueError(f"Malformed analysis request: {request}")
    if seed is not None and not _is_int(seed):
        raise ValueError(f"Malformed analysis request: {request}")
    return json.dumps(analyse(checked, iterations, seed))


def _is_int(value: object) -> TypeGuard[int]:
    # bool is a subclass of int, but true is not a move
    return isinstance(value, int) and not isinstance(value, bool)
