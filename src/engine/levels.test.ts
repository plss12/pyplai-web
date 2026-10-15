import { describe, expect, it } from "vitest";
import { ITERATIONS, LEVELS, hintIterations } from "./levels";

describe("levels", () => {
  it("get stronger from easy to impossible", () => {
    const iterations = LEVELS.map((level) => ITERATIONS[level]);
    expect(iterations).toEqual([...iterations].sort((a, b) => a - b));
  });

  it("give hints as strong as the opponent, never below medium", () => {
    expect(hintIterations("easy")).toBe(ITERATIONS.medium);
    expect(hintIterations("medium")).toBe(ITERATIONS.medium);
    expect(hintIterations("hard")).toBe(ITERATIONS.hard);
    expect(hintIterations("impossible")).toBe(ITERATIONS.impossible);
  });
});
