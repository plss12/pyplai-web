# pyplAI Web

Play Ultimate tic-tac-toe against the Monte Carlo tree search of
[pyplAI](https://github.com/plss12/pyplAI), running in your browser: the computer is the real
Python library, compiled to WebAssembly with [Pyodide](https://pyodide.org) and run in a Web
Worker. No server is involved.

**Play:** https://plss12.github.io/pyplai-web/

Four levels, from 25 to 6,400 simulations per move, calibrated in a tournament of 1,080 games
between search strengths ([how](docs/decisions/002-levels-by-iterations.md)). You can also ask
for a hint or watch which moves the computer considered and how often each one won.

## How it works

- The board, legal moves and results are computed in TypeScript (`src/game/`), so the page
  responds at once.
- Each computer move replays the game in Python (`python/pyplai_web/`) and runs pyplAI's MCTS
  with a fixed number of iterations per difficulty level, so a level plays the same on any device.
- A fixture written by the Python rules checks that both implementations agree.

The decisions behind this design are in [`docs/decisions/`](docs/decisions/).

## Development

Requires Node 22.12+ and [uv](https://docs.astral.sh/uv/).

```bash
npm ci && uv sync
npm run dev          # copies Pyodide and bundles the Python engine first
npm test             # TypeScript tests
uv run pytest        # Python tests
uv run ruff check . && uv run pyright
npm run build
```

## License

MIT. Built on [pyplAI](https://github.com/plss12/pyplAI), by the same author.
