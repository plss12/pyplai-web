# 002. Difficulty levels by MCTS iterations

## Context

The computer's strength grows with how much it searches. pyplAI's MCTS can stop after a time or
after a number of iterations (`iteraciones`, new in 1.1.0).

## Decision

Each level is a fixed number of MCTS iterations per move (`src/engine/levels.ts`), not a time.
A time limit would make "hard" much weaker on a slow phone than on a fast computer; a number of
iterations plays the same everywhere and can be calibrated.

The numbers come from a calibration in `calibration/`: a round robin between iteration counts,
with fixed seeds and alternating who starts. The highest level is the strongest that still
answers in an acceptable time on a phone, and the site does not claim it is unbeatable.

## Alternatives discarded

- **Time per move**: inconsistent between devices.
- **Weakening a strong search with random moves**: plays unnaturally, and the levels would not
  be pyplAI's MCTS at different strengths.

## Status

The numbers in `levels.ts` are provisional until the calibration runs.
