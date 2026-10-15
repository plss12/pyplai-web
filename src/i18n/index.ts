/**
 * Interface text in Spanish (default, at /) and English (at /en/). Every string is a
 * Localized value, so the compiler demands both languages.
 */
import type { Level } from "@/engine/levels";
import type { Move } from "@/game/ultimate";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
type Localized<T> = Record<Locale, T>;

// Positions of a 3x3 grid in reading order. Spanish needs the masculine form for boards
// ("tablero") and the feminine one for cells ("casilla").
const SPANISH_BOARDS = [
  "superior izquierdo",
  "superior",
  "superior derecho",
  "izquierdo",
  "central",
  "derecho",
  "inferior izquierdo",
  "inferior",
  "inferior derecho",
] as const;
const SPANISH_CELLS = [
  "superior izquierda",
  "superior",
  "superior derecha",
  "izquierda",
  "central",
  "derecha",
  "inferior izquierda",
  "inferior",
  "inferior derecha",
] as const;
const ENGLISH = [
  "top left",
  "top",
  "top right",
  "left",
  "centre",
  "right",
  "bottom left",
  "bottom",
  "bottom right",
] as const;

/** "tablero central, casilla superior" / "centre board, top cell". */
export function describeMove(locale: Locale, move: Move): string {
  const board = Math.floor(move / 9);
  const cell = move % 9;
  return locale === "es"
    ? `tablero ${SPANISH_BOARDS[board]}, casilla ${SPANISH_CELLS[cell]}`
    : `${ENGLISH[board]} board, ${ENGLISH[cell]} cell`;
}

export function describeBoard(locale: Locale, board: number): string {
  return locale === "es" ? `el tablero ${SPANISH_BOARDS[board]}` : `the ${ENGLISH[board]} board`;
}

const LEVEL_NAMES: Localized<Record<Level, string>> = {
  es: { easy: "Fácil", medium: "Medio", hard: "Difícil", impossible: "Imposible" },
  en: { easy: "Easy", medium: "Medium", hard: "Hard", impossible: "Impossible" },
};

export const levelName = (locale: Locale, level: Level): string => LEVEL_NAMES[locale][level];

export interface Strings {
  title: string;
  description: string;
  intro: string;
  board: string;
  move: string;
  level: string;
  side: string;
  sideX: string;
  sideO: string;
  newGame: string;
  start: string;
  cancel: string;
  playingAs: string;
  currentLevel: (level: string) => string;
  hint: string;
  showThinking: string;
  loading: string;
  yourTurn: string;
  computerTurn: string;
  unavailable: string;
  playIn: (board: string) => string;
  playAnywhere: string;
  thinking: (iterations: number) => string;
  computerPlayed: (move: string) => string;
  hintLabel: string;
  hintFor: (move: string, winRate: string) => string;
  won: string;
  lost: string;
  draw: string;
  loadFailed: (reason: string) => string;
  analysisFailed: (reason: string) => string;
  reload: string;
  thinkingTitle: string;
  thinkingEmpty: string;
  thinkingSummary: (iterations: number, seconds: string) => string;
  winRate: string;
  visits: string;
  cell: (move: string, state: string) => string;
  empty: string;
  played: (side: string) => string;
  closed: string;
  about: string;
  source: string;
  otherLanguage: string;
}

const numberFormat = (locale: Locale): Intl.NumberFormat => new Intl.NumberFormat(locale);

export const STRINGS: Localized<Strings> = {
  es: {
    title: "Ultimate tic-tac-toe contra pyplAI",
    description:
      "Juega al Ultimate tic-tac-toe contra la búsqueda de Monte Carlo de pyplAI, que se ejecuta en tu navegador.",
    intro:
      "Juegas contra el MCTS de pyplAI, una librería de Python, que se ejecuta en tu navegador con Pyodide.",
    board: "Tablero",
    move: "Jugada",
    level: "Nivel",
    side: "Juegas con",
    sideX: "X, empiezas tú",
    sideO: "O, empieza la IA",
    newGame: "Nueva partida",
    start: "Empezar",
    cancel: "Cancelar",
    playingAs: "juegas con",
    currentLevel: (level) => `Nivel ${level}`,
    hint: "Pedir una pista",
    showThinking: "Ver lo que piensa la IA",
    loading: "Cargando la IA en tu navegador…",
    yourTurn: "Te toca",
    computerTurn: "Juega la IA",
    unavailable: "IA no disponible",
    playIn: (board) => `Juega en ${board}.`,
    playAnywhere: "Puedes jugar en cualquier tablero libre.",
    thinking: (n) => `La IA piensa: ${numberFormat("es").format(n)} simulaciones…`,
    computerPlayed: (move) => `La IA ha jugado en el ${move}.`,
    hintLabel: "Pista:",
    hintFor: (move, rate) => `juega en el ${move} (${rate} de victorias).`,
    won: "Has ganado",
    lost: "Ha ganado la IA",
    draw: "Tablas",
    loadFailed: (reason) => `No se ha podido cargar la IA (${reason}). Recarga la página para intentarlo de nuevo.`,
    analysisFailed: (reason) => `La IA ha fallado al pensar (${reason}). Empieza una nueva partida.`,
    reload: "Recargar la página",
    thinkingTitle: "Lo que piensa la IA",
    thinkingEmpty: "Aparecerá aquí después de la próxima jugada de la IA.",
    thinkingSummary: (n, s) =>
      `En su última jugada simuló ${numberFormat("es").format(n)} partidas en ${s}\u00a0s. Estas son las opciones que más exploró:`,
    winRate: "Victorias",
    visits: "Simulaciones",
    cell: (move, state) => `${move}: ${state}`,
    empty: "libre",
    played: (side) => `ocupada por ${side}`,
    closed: "tablero cerrado",
    about: "Cómo funciona",
    source: "Código en GitHub",
    otherLanguage: "English",
  },
  en: {
    title: "Ultimate tic-tac-toe against pyplAI",
    description:
      "Play Ultimate tic-tac-toe against pyplAI's Monte Carlo tree search, running in your browser.",
    intro:
      "You play against the MCTS of pyplAI, a Python library, running in your browser with Pyodide.",
    board: "Board",
    move: "Move",
    level: "Level",
    side: "You play",
    sideX: "X, you start",
    sideO: "O, the computer starts",
    newGame: "New game",
    start: "Start",
    cancel: "Cancel",
    playingAs: "you play",
    currentLevel: (level) => `${level} level`,
    hint: "Get a hint",
    showThinking: "Show what the computer thinks",
    loading: "Loading the computer in your browser…",
    yourTurn: "Your turn",
    computerTurn: "Computer's turn",
    unavailable: "Computer unavailable",
    playIn: (board) => `Play in ${board}.`,
    playAnywhere: "You can play in any open board.",
    thinking: (n) => `The computer is thinking: ${numberFormat("en").format(n)} simulations…`,
    computerPlayed: (move) => `The computer played in the ${move}.`,
    hintLabel: "Hint:",
    hintFor: (move, rate) => `play in the ${move} (${rate} wins).`,
    won: "You won",
    lost: "The computer won",
    draw: "Draw",
    loadFailed: (reason) => `The computer could not load (${reason}). Reload the page to try again.`,
    analysisFailed: (reason) => `The computer failed while thinking (${reason}). Start a new game.`,
    reload: "Reload the page",
    thinkingTitle: "What the computer thinks",
    thinkingEmpty: "It shows here after the computer's next move.",
    thinkingSummary: (n, s) =>
      `For its last move it simulated ${numberFormat("en").format(n)} games in ${s}\u00a0s. These are the options it explored most:`,
    winRate: "Wins",
    visits: "Simulations",
    cell: (move, state) => `${move}: ${state}`,
    empty: "empty",
    played: (side) => `taken by ${side}`,
    closed: "closed board",
    about: "How it works",
    source: "Code on GitHub",
    otherLanguage: "Español",
  },
};
