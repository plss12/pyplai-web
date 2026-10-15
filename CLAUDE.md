# pyplAI Web

## Proyecto

Web estática para jugar a Ultimate tic-tac-toe contra el MCTS de
[pyplAI](https://github.com/plss12/pyplAI), la librería de Pedro, ejecutado en el navegador con
Pyodide. Es un escaparate de la librería para su portfolio: el rival tiene que ser pyplAI de
verdad, no una reimplementación. Se publica en https://plss12.github.io/pyplai-web/. El porqué de
la arquitectura está en `docs/decisions/`.

## Stack y comandos

- Astro + Tailwind + TypeScript (`strictest`), sin framework de UI. Python 3.14 (el de Pyodide 314)
  con uv para el motor.
- `npm run dev` · `npm test` (Vitest) · `npm run build` (incluye `astro check`) ·
  `uv run pytest` · `uv run ruff check .` · `uv run pyright`. La CI (`.github/workflows/ci.yml`)
  ejecuta todo eso y despliega `main` en GitHub Pages.
- `npm run dev` y `npm run build` ejecutan antes `npm run assets`, que copia Pyodide a
  `public/pyodide/` y empaqueta el Python en `public/py/engine.zip` (ambos generados e ignorados
  por git). Necesita `uv` en el PATH.

## Estructura

- `python/pyplai_web/`: reglas de Ultimate (`ultimate.py`) y motor (`engine.py`, `analyse_json`
  es la frontera con el worker).
- `src/game/`: las mismas reglas en TS, para la UI.
- `src/engine/`: worker de Pyodide, cliente con validación Zod y niveles (`levels.ts`).
- `calibration/`: torneo entre números de iteraciones que fija los niveles.
- `typings/pyplAI/`: stub con los tipos de la parte de pyplAI que se usa (la librería no los trae).

## Convenciones

- Las reglas existen dos veces. Si cambia `ultimate.py`, regenerar el fixture con
  `uv run python scripts/make_parity_fixture.py` y comprobar que `npm test` sigue en verde;
  `tests/test_parity_fixture.py` falla si el fixture está desfasado.
- Los niveles se miden en iteraciones de MCTS, nunca en tiempo (ADR 002). Sus valores salen de la
  calibración (`calibration/results.csv`): si cambian las reglas o pyplAI, repetirla
  (`uv run python calibration/tournament.py`, ~8 h de CPU) antes de tocar `levels.ts`.
- Todo lo que llega del worker se valida con los esquemas de `src/engine/protocol.ts`.
- pyright en `strict` sin reglas desactivadas: lo que falte de pyplAI se añade al stub.
- Rutas con la base `/pyplai-web/`: en el cliente, `import.meta.env.BASE_URL`.
- Commits con Conventional Commits, en inglés y sin Claude como coautor.

## Skills

- `accessibility`: al construir o revisar el tablero y los controles (teclado, lectores de pantalla).
- `performance`, `core-web-vitals`: al tocar la carga de Pyodide, el worker o los recursos.
- `web-design-guidelines`: antes de dar por terminada una sección de la UI.
- `web-quality-audit`, `seo`, `best-practices`: auditoría completa antes de publicar.
