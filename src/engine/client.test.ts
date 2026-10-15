import { describe, expect, it } from "vitest";
import { CancelledError, Engine, type WorkerLike } from "./client";
import type { AnalyseRequest, WorkerMessage } from "./protocol";

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly sent: AnalyseRequest[] = [];

  postMessage(message: AnalyseRequest): void {
    this.sent.push(message);
  }

  reply(data: WorkerMessage | Record<string, unknown>): void {
    this.onmessage?.({ data } as MessageEvent<unknown>);
  }
}

const analysis = {
  best: 4,
  moves: [
    { move: 4, visits: 30, value: 0.6 },
    { move: 0, visits: 20, value: 0.4 },
  ],
  iterations: 50,
  seconds: 0.02,
};

function setup(): { worker: FakeWorker; engine: Engine } {
  const worker = new FakeWorker();
  return { worker, engine: new Engine(worker) };
}

describe("Engine", () => {
  it("resolves ready with the load time", async () => {
    const { worker, engine } = setup();
    worker.reply({ type: "ready", seconds: 1.5 });
    await expect(engine.ready).resolves.toBe(1.5);
  });

  it("sends the request and resolves with the validated analysis", async () => {
    const { worker, engine } = setup();
    const result = engine.analyse([40], 50);
    expect(worker.sent).toEqual([{ type: "analyse", id: 1, moves: [40], iterations: 50, seed: null }]);
    worker.reply({ type: "result", id: 1, analysis: JSON.stringify(analysis) });
    await expect(result).resolves.toEqual(analysis);
  });

  it("rejects an analysis that does not match the schema", async () => {
    const { worker, engine } = setup();
    const result = engine.analyse([], 50);
    worker.reply({ type: "result", id: 1, analysis: JSON.stringify({ ...analysis, best: 99 }) });
    await expect(result).rejects.toThrow("Invalid analysis");
  });

  it("rejects a reply that is not JSON", async () => {
    const { worker, engine } = setup();
    const result = engine.analyse([], 50);
    worker.reply({ type: "result", id: 1, analysis: "{" });
    await expect(result).rejects.toThrow("invalid JSON");
  });

  it("passes on errors from Python", async () => {
    const { worker, engine } = setup();
    const result = engine.analyse([40, 40], 50);
    worker.reply({ type: "error", id: 1, message: "ValueError: Move 2 (40) is not legal" });
    await expect(result).rejects.toThrow("not legal");
  });

  it("drops the answers of cancelled requests", async () => {
    const { worker, engine } = setup();
    const stale = engine.analyse([], 50);
    engine.cancelPending();
    await expect(stale).rejects.toBeInstanceOf(CancelledError);
    const fresh = engine.analyse([40], 50);
    worker.reply({ type: "result", id: 1, analysis: JSON.stringify({ ...analysis, best: 0 }) });
    worker.reply({ type: "result", id: 2, analysis: JSON.stringify(analysis) });
    await expect(fresh).resolves.toEqual(analysis);
  });

  it("rejects ready and every waiting request when loading fails", async () => {
    const { worker, engine } = setup();
    const waiting = engine.analyse([], 50);
    worker.reply({ type: "failed", message: "HTTP 404" });
    await expect(engine.ready).rejects.toThrow("could not load");
    await expect(waiting).rejects.toThrow("could not load");
  });

  it("ignores messages that do not follow the protocol", () => {
    const { worker } = setup();
    expect(() => worker.reply({ type: "nonsense" })).not.toThrow();
  });
});
