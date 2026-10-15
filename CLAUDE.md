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
  `npm run test:e2e` (Playwright contra el build, Chrome de escritorio y móvil) · `uv run pytest` ·
  `uv run ruff check .` · `uv run pyright`. La CI (`.github/workflows/ci.yml`) ejecuta todo eso y
  despliega `main` en GitHub Pages.
- Si `astro check` pide instalar `@astrojs/check` y sale con 0, no ha comprobado nada: falta una
  dependencia en `node_modules`. Reinstalar con `npm ci`.
- `npm run dev` y `npm run build` ejecutan antes `npm run assets`, que copia Pyodide a
  `public/pyodide/` y empaqueta el Python en `public/py/engine.zip` (ambos generados e ignorados
  por git). Necesita `uv` en el PATH.

## Estructura

- `python/pyplai_web/`: reglas de Ultimate (`ultimate.py`) y motor (`engine.py`, `analyse_json`
  es la frontera con el worker).
- `src/game/`: las mismas reglas en TS, para la UI.
- `src/engine/`: worker de Pyodide, cliente con validación Zod y niveles (`levels.ts`).
- `src/ui/`: `app.ts` (controlador de la página), `match.ts` (lógica pura: turnos, flechas,
  `byVisits`) y `choice.ts` (última elección del diálogo en `localStorage`).
- `e2e/`: pruebas de extremo a extremo con Playwright.
- `calibration/`: `tournament.py` (calibración de niveles y, con `--selection-match`, media
  frente a visitas) y `summary.py`. Resultados en `results.csv` y `selection.csv`.
- `typings/pyplAI/`: stub con los tipos de la parte de pyplAI que se usa (la librería no los trae).

## Convenciones

- Las reglas existen dos veces. Si cambia `ultimate.py`, regenerar el fixture con
  `uv run python scripts/make_parity_fixture.py` y comprobar que `npm test` sigue en verde;
  `tests/test_parity_fixture.py` falla si el fixture está desfasado.
- Los niveles se miden en iteraciones de MCTS, nunca en tiempo (ADR 002). Sus valores salen de la
  calibración (`calibration/results.csv`): si cambian las reglas o pyplAI, repetirla
  (`uv run python calibration/tournament.py`, ~8 h de CPU) antes de tocar `levels.ts`.
- Todo lo que llega del worker se valida con los esquemas de `src/engine/protocol.ts`.
- La IA elige su jugada por media (`seleccion_final="media"`, el Algoritmo 2 de Browne et al.).
  La pista, la tabla y el sombreado ordenan por visitas. El ADR 002 recoge el experimento.
- Bando y nivel solo se eligen en el diálogo de nueva partida, nunca durante la partida.
- En el diálogo nada de `fieldset` + `legend`: Safari en iOS lo maqueta mal dentro del flex.
  Usar `div role="radiogroup"` etiquetado por su encabezado.
- pyright en `strict` sin reglas desactivadas: lo que falte de pyplAI se añade al stub.
- Rutas con la base `/pyplai-web/`: en el cliente, `import.meta.env.BASE_URL`.
- Commits con Conventional Commits, en inglés y sin Claude como coautor.

## Skills

- `accessibility`: al construir o revisar el tablero y los controles (teclado, lectores de pantalla).
- `performance`, `core-web-vitals`: al tocar la carga de Pyodide, el worker o los recursos.
- `web-design-guidelines`: antes de dar por terminada una sección de la UI.
- `web-quality-audit`, `seo`, `best-practices`: auditoría completa antes de publicar.
