# 002. Difficulty levels by MCTS iterations

## Context

The computer's strength grows with how much it searches. pyplAI's MCTS can stop after a time or
after a number of iterations (`iteraciones`, new in 1.1.0).

## Decision

Each level is a fixed number of MCTS iterations per move (`src/engine/levels.ts`), not a time.
A time limit would make "hard" much weaker on a slow phone than on a fast computer; a number of
iterations plays the same everywhere and can be calibrated.

| Level | Iterations | Rating (Elo scale, random play = 0) | Against the level below |
| --- | --- | --- | --- |
| Easy | 25 | 410 | Beats random play 95% |
| Medium | 200 | 842 | +432 |
| Hard | 1,600 | 1,250 | +408 |
| Impossible | 6,400 | 1,530 | +280 |

The hint analyses the player's position with the hard level's 1,600 iterations.

## Calibration

`calibration/tournament.py` played 1,080 games (8.4 CPU hours) with the site's own engine code:
a ladder of iteration counts from 10 to 6,400, doubling each rung, where every rung met the next
two (x2 and x4) and random play, 40 games per pairing with fixed seeds and alternating who
starts. `calibration/summary.py` fits Bradley-Terry ratings to the results
(`calibration/results.csv`).

- Strength grew steadily with iterations: every doubling scored 65-80% against the rung below,
  about +110 to +210 Elo, with no plateau up to 6,400 (which still beat 3,200 by 66%).
- Easy, medium and hard are spaced by about 400 Elo, an expected score near 90% of a level
  against the one below; impossible sits 280 above hard. The ladder only paired x2 and x4, so
  of consecutive levels only hard and impossible met directly: 6,400 beat 1,600 by 86%. Easy
  against medium and medium against hard (x8 apart) rest on the fitted ratings.
- The ceiling is time, not strength. Measured speeds: 2,755-3,704 iterations per second in
  Safari on an iPhone, and 600-1,800 in headless Chromium on the author's laptop (slowest at the
  opening, before the JIT warms up). Impossible takes about 2 s per move on the iPhone and up to
  about 10 s at the opening on that laptop; 3,200 iterations would halve that but sit only
  +159 Elo above hard, too close to feel like another level.

The site does not claim impossible is unbeatable: it is the strongest search that still answers
in a few seconds.

## Alternatives discarded

- **Time per move**: inconsistent between devices.
- **Weakening a strong search with random moves**: plays unnaturally, and the levels would not
  be pyplAI's MCTS at different strengths.
