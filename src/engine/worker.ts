/// <reference lib="webworker" />
/**
 * Runs pyplAI's MCTS in Pyodide, off the main thread so the page stays responsive while the
 * computer thinks. Requests are handled one at a time, in order.
 */
import type { loadPyodide as LoadPyodide } from "pyodide";
import type { AnalyseRequest, WorkerMessage } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

// public/ is served under the site's base path (/pyplai-web/ on GitHub Pages)
const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, "/"), self.location.origin);

const post = (message: WorkerMessage): void => self.postMessage(message);

function describe(error: unknown): string {
  // A Python exception arrives as a PythonError whose message is the whole traceback: its last
  // line ("ValueError: ...") is the part worth showing
  const text = error instanceof Error ? error.message : String(error);
  return text.trim().split("\n").at(-1) ?? text;
}

async function boot(): Promise<(request: string) => string> {
  const started = performance.now();
  // Loaded at run time from public/pyodide (see scripts/copy-pyodide.mjs), not bundled
  const module = (await import(/* @vite-ignore */ new URL("pyodide/pyodide.mjs", root).href)) as {
    loadPyodide: typeof LoadPyodide;
  };
  const pyodide = await module.loadPyodide({ indexURL: new URL("pyodide/", root).href });
  const archive = await fetch(new URL("py/engine.zip", root));
  if (!archive.ok) throw new Error(`Could not download the Python engine (HTTP ${archive.status})`);
  pyodide.unpackArchive(await archive.arrayBuffer(), "zip", { extractDir: "/home/pyodide" });
  // analyse_json takes and returns JSON strings (python/pyplai_web/engine.py), which Pyodide
  // converts to and from JavaScript strings without proxies
  const analyseJson = pyodide.pyimport("pyplai_web.engine").analyse_json as (request: string) => string;
  post({ type: "ready", seconds: (performance.now() - started) / 1000 });
  return analyseJson;
}

const engine = boot();
engine.catch((error: unknown) => {
  console.error("pyplAI engine failed to load", error);
  post({ type: "failed", message: describe(error) });
});

self.onmessage = async (event: MessageEvent<AnalyseRequest>) => {
  const { id, moves, iterations, seed } = event.data;
  let analyseJson: (request: string) => string;
  try {
    analyseJson = await engine;
  } catch {
    // Already reported once by the boot handler above; this request cannot run
    post({ type: "error", id, message: "The engine is not available" });
    return;
  }
  try {
    const analysis = analyseJson(JSON.stringify({ moves, iterations, seed }));
    post({ type: "result", id, analysis });
  } catch (error) {
    console.error(`pyplAI analysis ${id} failed`, error);
    post({ type: "error", id, message: describe(error) });
  }
};
