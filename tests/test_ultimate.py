import random
from copy import deepcopy

import pytest

from pyplai_web.ultimate import DRAWN, LINES, UltimateTicTacToe


def move(board: int, cell: int) -> int:
    return board * 9 + cell


def test_a_move_sends_the_opponent_to_the_matching_board() -> None:
    state = UltimateTicTacToe().apply(move(4, 2))
    assert {m // 9 for m in state.legal_moves()} == {2}


def test_a_full_board_without_winner_closes_drawn_and_frees_the_next_player() -> None:
    state = UltimateTicTacToe()
    # Fill board 0 with no three in a row, always sending the next move back to it
    for cell in (0, 1, 2, 4, 3, 5, 7, 6, 8):
        state.target = 0
        state.apply(move(0, cell))
    assert state.main[0] == DRAWN
    state.target = 0
    boards = {m // 9 for m in state.legal_moves()}
    assert boards == set(range(1, 9))
    assert state.winner() is None


def test_three_boards_in_a_row_win_the_game() -> None:
    state = UltimateTicTacToe()
    # Player 1 wins boards 0, 1 and 2 through the top row of each. Player 2 always takes the first
    # free cell outside them: it wins boards 3 and 4 but runs out of moves before a third board
    for board in (0, 1, 2):
        for cell in (0, 1, 2):
            state.target = board
            state.apply(move(board, cell))
            if state.winner() is not None:
                break
            state.target = None
            reply = next(m for m in state.legal_moves() if m // 9 not in (0, 1, 2))
            state.apply(reply)
    assert state.winner() == 1
    assert state.legal_moves() == []
    assert state.is_terminal()


def test_from_moves_rejects_an_illegal_move() -> None:
    with pytest.raises(ValueError, match="Move 2"):
        UltimateTicTacToe.from_moves([move(4, 2), move(4, 0)])


def test_stored_winner_matches_the_big_board() -> None:
    # apply keeps the winner instead of scanning the big board on every call: it must always
    # agree with a full scan, including after search copies of the state
    rng = random.Random(1)
    draws = 0
    for _ in range(300):
        game = UltimateTicTacToe()
        while True:
            state = deepcopy(game) if rng.random() < 0.5 else game
            for player in (1, 2):
                scanned = any(all(state.main[i] == player for i in line) for line in LINES)
                assert state.is_winner(player) == scanned
            if game.winner() is not None:
                draws += game.winner() == 0
                break
            game.apply(rng.choice(game.legal_moves()))
    # Random play reaches drawn games too, so the draw path is exercised
    assert draws > 0
