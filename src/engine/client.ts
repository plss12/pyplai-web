/**
 * The page's side of the engine worker: promises for requests, validated replies, and a way to
 * forget requests whose answer no longer matters (a new game, a move undone...).
 */
import { analysisSchema, workerMessageSchema, type Analysis, type AnalyseRequest } from "./protocol";

/** The part of Worker the client uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: AnalyseRequest): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** Rejects requests dropped with cancelPending: callers can ignore it. */
export class CancelledError extends Error {
  constructor() {
    super("The analysis is no longer needed");
    this.name = "CancelledError";
  }
}

interface Pending {
  resolve: (analysis: Analysis) => void;
  reject: (error: Error) => void;
}

export class Engine {
  /** Resolves with the load time in seconds once Pyodide and pyplAI are ready. */
  readonly ready: Promise<number>;
  readonly #worker: WorkerLike;
  readonly #pending = new Map<number, Pending>();
  #nextId = 1;

  constructor(worker: WorkerLike = createWorker()) {
    this.#worker = worker;
    let resolveReady!: (seconds: number) => void;
    let rejectReady!: (error: Error) => void;
    this.ready = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    worker.onmessage = (event) => {
      const parsed = workerMessageSchema.safeParse(event.data);
      if (!parsed.success) {
        console.error("Unexpected message from the engine worker", event.data, parsed.error);
        return;
      }
      const message = parsed.data;
      if (message.type === "ready") {
        resolveReady(message.seconds);
        return;
      }
      if (message.id === null) {
        const error = new Error(`The engine could not load: ${message.message}`);
        rejectReady(error);
        this.#rejectAll(error);
        return;
      }
      // Requests dropped with cancelPending are no longer in the map: their answer is ignored
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.type === "error") {
        pending.reject(new Error(message.message));
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(message.analysis);
      } catch (error) {
        pending.reject(new Error(`The engine replied with invalid JSON: ${String(error)}`));
        return;
      }
      const analysis = analysisSchema.safeParse(json);
      if (analysis.success) {
        pending.resolve(analysis.data);
      } else {
        pending.reject(new Error(`Invalid analysis from the engine: ${analysis.error.message}`));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(`The engine worker crashed: ${event.message}`);
      rejectReady(error);
      this.#rejectAll(error);
    };
  }

  /** Rank the legal moves after ``moves`` with the given MCTS iterations. */
  analyse(moves: readonly number[], iterations: number, seed: number | null = null): Promise<Analysis> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ type: "analyse", id, moves: [...moves], iterations, seed });
    });
  }

  /**
   * Reject every request still waiting, with CancelledError. The worker finishes the search it
   * is running (Python cannot be interrupted without cross-origin isolation, which GitHub Pages
   * cannot enable) but its answer is dropped.
   */
  cancelPending(): void {
    this.#rejectAll(new CancelledError());
  }

  #rejectAll(error: Error): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }
}

function createWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
}
