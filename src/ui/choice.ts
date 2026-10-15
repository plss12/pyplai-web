/**
 * The side and level of a new game, remembered in this browser so the dialog opens with the
 * last choice. Storage is a convenience: when it is blocked or holds something unexpected, the
 * dialog falls back to the defaults.
 */
import { z } from "zod";
import { LEVELS } from "@/engine/levels";

const KEY = "pyplai-web:new-game";

const choiceSchema = z.object({
  side: z.union([z.literal(1), z.literal(2)]),
  level: z.enum(LEVELS),
});

export type Choice = z.infer<typeof choiceSchema>;

export const DEFAULT_CHOICE: Choice = { side: 1, level: "medium" };

/** The part of Storage this module uses, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadChoice(storage: StorageLike | null): Choice {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULT_CHOICE;
    const parsed = choiceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_CHOICE;
  } catch (error) {
    // Private windows and blocked site data throw here; the defaults still work
    console.warn("Could not read the last game settings", error);
    return DEFAULT_CHOICE;
  }
}

export function saveChoice(storage: StorageLike | null, choice: Choice): void {
  try {
    storage?.setItem(KEY, JSON.stringify(choice));
  } catch (error) {
    console.warn("Could not remember the game settings", error);
  }
}
