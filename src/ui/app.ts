/**
 * The game page: wires the board and the controls to the rules (src/game) and the engine
 * worker (src/engine). Everything the player sees is drawn by render() from the state below.
 */
import { CancelledError, Engine } from "@/engine/client";
import { ITERATIONS, LEVELS, hintIterations, type Level } from "@/engine/levels";
import type { Analysis } from "@/engine/protocol";
import { DRAWN, activeBoards, legalMoves, newGame, play, type GameState, type Move, type Player } from "@/game/ultimate";
import { LOCALES, STRINGS, describeBoard, describeMove, levelName, type Locale } from "@/i18n";
import { loadChoice, saveChoice, type Choice, type StorageLike } from "./choice";
import { byVisits, computerToMove, neighbour, result } from "./match";

type EngineStatus = "loading" | "ready" | "failed";

/** How many of the computer's options the board and the table show. */
const TOP_MOVES = 5;

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`The game markup has no ${selector}`);
  return element;
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch (error) {
    // Some browsers throw on the mere access when site data is blocked
    console.warn("Local storage is not available", error);
    return null;
  }
}

export function mountGame(root: HTMLElement): void {
  const locale: Locale = LOCALES.find((l) => l === root.dataset["locale"]) ?? "es";
  const t = STRINGS[locale];
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat(locale);
  const seconds = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const boardElement = required<HTMLElement>(root, "[data-board]");
  const cells = new Map<Move, HTMLButtonElement>();
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-move]")) {
    cells.set(Number(button.dataset["move"]), button);
  }
  const smallBoards = [...root.querySelectorAll<HTMLElement>("[data-small-board]")];
  const statusElement = required<HTMLElement>(root, "[data-status]");
  const detailElement = required<HTMLElement>(root, "[data-detail]");
  const reloadButton = required<HTMLButtonElement>(root, "[data-reload]");
  const hintButton = required<HTMLButtonElement>(root, "[data-hint-button]");
  const hintText = required<HTMLElement>(root, "[data-hint-text]");
  const hintBody = required<HTMLElement>(root, "[data-hint-body]");
  const showThinking = required<HTMLInputElement>(root, "[data-show-thinking]");
  const newGameButton = required<HTMLButtonElement>(root, "[data-new-game]");
  const thinkingPanel = required<HTMLElement>(root, "[data-thinking-panel]");
  const thinkingSummary = required<HTMLElement>(root, "[data-thinking-summary]");
  const thinkingTable = required<HTMLElement>(root, "[data-thinking-table]");
  const thinkingRows = required<HTMLElement>(root, "[data-thinking-rows]");
  const currentGame = required<HTMLElement>(root, "[data-current-game]");
  const currentLevel = required<HTMLElement>(root, "[data-current-level]");
  const currentSide = required<HTMLElement>(root, "[data-current-side]");
  const dialog = required<HTMLDialogElement>(root, "[data-new-game-dialog]");
  const cancelButton = required<HTMLButtonElement>(dialog, "[data-cancel]");
  const storage = browserStorage();

  // ------------------------------------------------------------------ state

  let engine: Engine | null = null;
  let engineStatus: EngineStatus = "loading";
  /** False until the first game is chosen in the dialog: the board takes no moves before. */
  let started = false;
  let game: GameState = newGame();
  let human: Player = 1;
  let level: Level = "medium";
  /** The computer's last analysis and the position it analysed. */
  let lastThought: { analysis: Analysis; before: GameState } | null = null;
  /**
   * The hint for the position after ``position`` moves. One per turn: different searches can
   * suggest different moves, and asking again until one looks right would make the computer
   * seem to contradict itself.
   */
  let hint: { move: Move; value: number; position: number } | null = null;
  let busy: "computer" | "hint" | null = null;
  /** What the status line says about the last thing that happened, besides whose turn it is. */
  let news: string | null = null;
  let failure: string | null = null;
  let focused: Move = 40;
  // Bumped on every new game: answers that arrive for an older game are dropped
  let generation = 0;

  // Side and level only change through the new game dialog, never during a game
  const dialogChoice = (): Choice => ({
    side: dialog.querySelector<HTMLInputElement>('input[name="side"]:checked')?.value === "2" ? 2 : 1,
    level: LEVELS.find((l) => l === dialog.querySelector<HTMLInputElement>('input[name="level"]:checked')?.value) ?? "medium",
  });

  function setDialogChoice(choice: Choice): void {
    for (const input of dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      input.checked = input.value === (input.name === "side" ? String(choice.side) : choice.level);
    }
  }

  function openNewGameDialog(): void {
    setDialogChoice(started ? { side: human, level } : loadChoice(storage));
    // Before the first game there is nothing to go back to, so there is no cancelling
    cancelButton.hidden = !started;
    dialog.returnValue = "";
    dialog.showModal();
  }

  // ------------------------------------------------------------------ actions

  async function computerMove(): Promise<void> {
    if (!started || !engine || engineStatus !== "ready" || busy || !computerToMove(game, human)) return;
    const current = generation;
    busy = "computer";
    hint = null;
    render();
    try {
      const analysis = await engine.analyse(game.moves, ITERATIONS[level]);
      if (current !== generation) return;
      const before = game;
      game = play(game, analysis.best);
      lastThought = { analysis, before };
      news = t.computerPlayed(describeMove(locale, analysis.best));
    } catch (error) {
      if (error instanceof CancelledError || current !== generation) return;
      console.error("The computer's move failed", error);
      failure = t.analysisFailed(errorText(error));
    } finally {
      if (current === generation) {
        busy = null;
        render();
      }
    }
  }

  const hintGiven = (): boolean => hint !== null && hint.position === game.moves.length;

  async function askHint(): Promise<void> {
    if (!engine || engineStatus !== "ready" || busy || game.toMove !== human || game.outcome !== null) return;
    if (hintGiven()) return;
    const current = generation;
    const position = game.moves.length;
    busy = "hint";
    render();
    try {
      const analysis = await engine.analyse(game.moves, hintIterations(level));
      // The player may have moved while the hint was being computed
      if (current !== generation || game.moves.length !== position) return;
      // The most explored move, not pyplAI's mean-reward pick (see byVisits)
      const [best] = byVisits(analysis.moves);
      if (best) hint = { move: best.move, value: best.value, position };
    } catch (error) {
      if (error instanceof CancelledError || current !== generation) return;
      console.error("The hint failed", error);
      failure = t.analysisFailed(errorText(error));
    } finally {
      if (current === generation && busy === "hint") {
        busy = null;
        render();
      }
    }
  }

  function humanMove(move: Move): void {
    if (!started || busy === "computer" || game.toMove !== human || !legalMoves(game).includes(move)) return;
    if (busy === "hint") {
      engine?.cancelPending();
      busy = null;
    }
    game = play(game, move);
    hint = null;
    news = null;
    render();
    void computerMove();
  }

  function startNewGame(choice: Choice): void {
    generation += 1;
    engine?.cancelPending();
    busy = null;
    started = true;
    human = choice.side;
    level = choice.level;
    game = newGame();
    lastThought = null;
    hint = null;
    news = null;
    if (engineStatus !== "failed") failure = null;
    render();
    void computerMove();
  }

  // ------------------------------------------------------------------ drawing

  function statusLine(): { title: string; detail: string; hint: string | null } {
    if (!started) return { title: t.newGame, detail: t.intro, hint: null };
    const outcome = result(game, human);
    if (outcome === "won") return { title: t.won, detail: news ?? "", hint: null };
    if (outcome === "lost") return { title: t.lost, detail: news ?? "", hint: null };
    if (outcome === "draw") return { title: t.draw, detail: news ?? "", hint: null };
    if (failure) return { title: t.unavailable, detail: failure, hint: null };
    if (game.toMove !== human) {
      const detail = engineStatus === "loading" ? t.loading : t.thinking(ITERATIONS[level]);
      return { title: t.computerTurn, detail, hint: null };
    }
    const boards = activeBoards(game);
    const [only] = boards;
    const where = boards.size === 1 && only !== undefined ? t.playIn(describeBoard(locale, only)) : t.playAnywhere;
    const parts = [news, where];
    if (engineStatus === "loading") parts.push(t.loading);
    const hintLine = hintGiven() && hint ? t.hintFor(describeMove(locale, hint.move), percent.format(hint.value)) : null;
    return { title: t.yourTurn, detail: parts.filter(Boolean).join(" "), hint: hintLine };
  }

  /** The computer's options to draw on the board: only right after it moved. */
  function heatMoves(): Analysis["moves"] {
    if (!showThinking.checked || !lastThought) return [];
    if (game.moves.length !== lastThought.before.moves.length + 1) return [];
    return byVisits(lastThought.analysis.moves).slice(0, TOP_MOVES);
  }

  function render(): void {
    const humanTurn = started && game.outcome === null && game.toMove === human && busy !== "computer";
    const legal = new Set(humanTurn ? legalMoves(game) : []);
    const active = humanTurn ? activeBoards(game) : new Set<number>();
    const heat = heatMoves();
    const maxVisits = Math.max(1, ...heat.map((e) => e.visits));
    const last = game.moves.at(-1);

    for (const [move, button] of cells) {
      const mark = game.cells[move] ?? 0;
      const closed = (game.main[Math.floor(move / 9)] ?? 0) !== 0;
      setFlag(button, "mark", mark === 0 ? null : String(mark));
      setFlag(button, "playable", legal.has(move) ? "" : null);
      setFlag(button, "last", move === last ? "" : null);
      setFlag(button, "hint", hintGiven() && hint?.move === move ? "" : null);
      button.setAttribute("aria-disabled", String(!legal.has(move)));
      button.tabIndex = move === focused ? 0 : -1;
      const state = mark !== 0 ? t.played(mark === 1 ? "X" : "O") : closed ? t.closed : t.empty;
      button.setAttribute("aria-label", t.cell(describeMove(locale, move), state));

      const evaluation = heat.find((e) => e.move === move);
      const label = required<HTMLElement>(button, "[data-heat-label]");
      if (evaluation) {
        button.dataset["heat"] = "";
        button.style.setProperty("--heat", String(evaluation.visits / maxVisits));
        label.textContent = percent.format(evaluation.value);
        label.hidden = mark !== 0;
      } else {
        delete button.dataset["heat"];
        button.style.removeProperty("--heat");
        label.hidden = true;
      }
    }

    smallBoards.forEach((element, board) => {
      const owner = game.main[board] ?? 0;
      setFlag(element, "active", active.has(board) ? "" : null);
      setFlag(element, "closed", owner !== 0 ? "" : null);
      const closedMark = required<HTMLElement>(element, "[data-closed-mark]");
      closedMark.hidden = owner === 0 || owner === DRAWN;
      setFlag(closedMark, "mark", owner === 1 || owner === 2 ? String(owner) : null);
    });

    const { title, detail, hint: hintLine } = statusLine();
    statusElement.textContent = title;
    detailElement.textContent = detail;
    hintText.hidden = hintLine === null;
    hintBody.textContent = hintLine ?? "";
    reloadButton.hidden = engineStatus !== "failed";
    hintButton.disabled = !humanTurn || engineStatus !== "ready" || busy !== null || hintGiven();
    currentGame.hidden = !started;
    currentLevel.textContent = t.currentLevel(levelName(locale, level));
    currentSide.textContent = human === 1 ? "X" : "O";
    currentSide.dataset["side"] = String(human);

    thinkingPanel.hidden = !showThinking.checked;
    renderThinkingPanel();
  }

  function renderThinkingPanel(): void {
    if (!lastThought) {
      thinkingSummary.textContent = t.thinkingEmpty;
      thinkingTable.hidden = true;
      return;
    }
    const { analysis } = lastThought;
    thinkingSummary.textContent = t.thinkingSummary(analysis.iterations, seconds.format(analysis.seconds));
    thinkingTable.hidden = false;
    thinkingRows.replaceChildren(
      ...byVisits(analysis.moves).slice(0, TOP_MOVES).map((e) => {
        const row = document.createElement("tr");
        row.className = "border-t border-line";
        for (const [text, align] of [
          [describeMove(locale, e.move), ""],
          [percent.format(e.value), "pl-4 text-right"],
          [integer.format(e.visits), "pl-4 text-right"],
        ] as const) {
          const cell = document.createElement("td");
          cell.className = `py-1.5 ${align}`;
          cell.textContent = text;
          row.append(cell);
        }
        return row;
      }),
    );
  }

  // ------------------------------------------------------------------ events

  boardElement.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-move]");
    if (!button) return;
    focused = Number(button.dataset["move"]);
    humanMove(focused);
  });

  // Track focus however it arrives (Tab, a click, a screen reader), so the arrows start from it
  boardElement.addEventListener("focusin", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-move]");
    if (button) focused = Number(button.dataset["move"]);
  });

  boardElement.addEventListener("keydown", (event) => {
    const next = neighbour(focused, event.key);
    if (next === null) return;
    event.preventDefault();
    focused = next;
    for (const [move, button] of cells) button.tabIndex = move === focused ? 0 : -1;
    cells.get(focused)?.focus();
  });

  hintButton.addEventListener("click", () => void askHint());
  newGameButton.addEventListener("click", openNewGameDialog);
  showThinking.addEventListener("change", render);
  reloadButton.addEventListener("click", () => location.reload());
  dialog.addEventListener("close", () => {
    // "start" from the button; anything else (Escape, Cancel) keeps the game in progress, or
    // starts the chosen one if there is none yet
    if (dialog.returnValue !== "start" && started) return;
    const choice = dialogChoice();
    saveChoice(storage, choice);
    startNewGame(choice);
  });

  // ------------------------------------------------------------------ start

  try {
    engine = new Engine();
  } catch (error) {
    console.error("Could not start the engine worker", error);
    engineStatus = "failed";
    failure = t.loadFailed(errorText(error));
  }
  engine?.ready.then(
    () => {
      engineStatus = "ready";
      render();
      void computerMove();
    },
    (error: unknown) => {
      console.error("The engine failed to load", error);
      engineStatus = "failed";
      failure = t.loadFailed(errorText(error));
      render();
    },
  );
  render();
  // The engine keeps loading in the background while the player picks a side and a level
  openNewGameDialog();
}

function setFlag(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) delete element.dataset[name];
  else element.dataset[name] = value;
}
