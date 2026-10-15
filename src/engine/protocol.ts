/**
 * Messages between the page and the engine worker. Whatever comes back from the worker (and
 * from Python inside it) is validated with these schemas before the interface uses it.
 */
import { z } from "zod";

export const analysisSchema = z.object({
  best: z.number().int().min(0).max(80),
  /** Every legal move, best first, as pyplAI ranks them (mean reward). */
  moves: z
    .array(
      z.object({
        move: z.number().int().min(0).max(80),
        visits: z.number().int().min(0),
        /** Mean reward of the player to move after this move: draws count as half a win. */
        value: z.number().min(0).max(1),
      }),
    )
    .min(1),
  iterations: z.number().int().min(1),
  seconds: z.number().min(0),
});

export type Analysis = z.infer<typeof analysisSchema>;

export interface AnalyseRequest {
  type: "analyse";
  id: number;
  moves: number[];
  iterations: number;
  /** null lets Python draw a fresh seed, so the computer does not always play the same game. */
  seed: number | null;
}

export const workerMessageSchema = z.discriminatedUnion("type", [
  /** Pyodide and the Python engine are loaded. */
  z.object({ type: z.literal("ready"), seconds: z.number().min(0) }),
  /** The Analysis as JSON, straight from Python: parsed and validated by the client. */
  z.object({ type: z.literal("result"), id: z.number().int(), analysis: z.string() }),
  /** Pyodide or the Python engine could not load: no request can run. */
  z.object({ type: z.literal("failed"), message: z.string() }),
  /** One request failed. */
  z.object({ type: z.literal("error"), id: z.number().int(), message: z.string() }),
]);

export type WorkerMessage = z.infer<typeof workerMessageSchema>;
