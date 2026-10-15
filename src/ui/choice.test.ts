import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CHOICE, loadChoice, saveChoice, type StorageLike } from "./choice";

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("remembered game settings", () => {
  it("round-trip through storage", () => {
    const storage = memory();
    saveChoice(storage, { side: 2, level: "impossible" });
    expect(loadChoice(storage)).toEqual({ side: 2, level: "impossible" });
  });

  it("fall back to the defaults when nothing or something invalid is stored", () => {
    const storage = memory();
    expect(loadChoice(storage)).toEqual(DEFAULT_CHOICE);
    storage.data.set("pyplai-web:new-game", JSON.stringify({ side: 3, level: "godlike" }));
    expect(loadChoice(storage)).toEqual(DEFAULT_CHOICE);
    storage.data.set("pyplai-web:new-game", "{not json");
    expect(loadChoice(storage)).toEqual(DEFAULT_CHOICE);
  });

  it("keep working when storage is blocked", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadChoice(blocked)).toEqual(DEFAULT_CHOICE);
    expect(() => saveChoice(blocked, DEFAULT_CHOICE)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
