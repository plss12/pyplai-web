# 001. Static site with pyplAI running in the browser

## Context

The site lets anyone play Ultimate tic-tac-toe against the Monte Carlo tree search (MCTS) of
[pyplAI](https://github.com/plss12/pyplAI), at several difficulty levels. It is a showcase for
the library, so the computer should be pyplAI itself, not a reimplementation. It should cost
nothing to host and keep working with many players at once.

## Decision

- **pyplAI runs in the browser** with [Pyodide](https://pyodide.org) (CPython compiled to
  WebAssembly), inside a Web Worker so the page stays responsive while the computer thinks.
  pyplAI is pure Python with no dependencies, which is what makes this possible.
- **Static site on GitHub Pages**: Astro, Tailwind and TypeScript, like the author's portfolio,
  with plain TypeScript for the client (an 81-cell board needs no UI framework).
- **Self-hosted Pyodide**, pinned to an exact version (`npm run assets` copies it from
  `node_modules` to `public/pyodide/`), so the site does not depend on a CDN.
- **The Python code ships as one zip** (`public/py/engine.zip`: pyplAI at the version in
  `uv.lock`, plus `pyplai_web`), unpacked into Pyodide's file system. No wheels or `micropip`:
  pyplAI 1.1.0 is not on PyPI yet, and serving our own files avoids depending on PyPI at run time.
- **The rules exist twice**: in TypeScript, so the board shows legal moves at once (even while
  Pyodide loads), and in Python, for the search. `src/game/ultimate.fixture.json`, written by the
  Python rules, checks that the TypeScript ones agree, and a pytest test fails when it is stale.
- **JSON between the worker and Python** (`analyse_json`), validated with Zod on the page.

## Alternatives discarded

- **Porting MCTS to TypeScript**: faster and lighter, but it would no longer be pyplAI.
- **A Python backend** (Render, Fly...): each search burns seconds of server CPU per move, which
  costs money or cold starts and scales badly with players at once.
- **Pyodide from a CDN**: one less build step, but a third-party dependency at run time.
- **Next.js**: a static, single-page game needs none of its server features.

## Consequences

- The first visit downloads about 13 MB uncompressed (mostly `pyodide.asm.wasm`), cached
  afterwards. Loading takes about 2.5 s on a desktop.
- A search cannot be interrupted: that needs `SharedArrayBuffer` and cross-origin isolation
  headers, which GitHub Pages cannot set. Answers that are no longer needed are dropped instead.
- Pyodide is slower than CPython here: 640-1,200 MCTS iterations per second from the opening in
  headless Chromium on the author's laptop, against about 2,000 in Node.
