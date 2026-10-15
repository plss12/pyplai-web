import { expect, test, type Page } from "@playwright/test";

const marks = (page: Page) => page.locator(".cell[data-mark]");

test("the player moves and pyplAI answers in the browser", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-status]")).toHaveText("Te toca");
  await page.locator('[data-move="40"]').click();
  // Pyodide loads, the worker runs MCTS and the computer's move appears
  await expect(marks(page)).toHaveCount(2, { timeout: 45_000 });
  await expect(page.locator("[data-status]")).toHaveText("Te toca");
  await expect(page.locator("[data-detail]")).toContainText("La IA ha jugado en el tablero central");
});

test("the board can be played with the keyboard", async ({ page }) => {
  await page.goto("./");
  await page.locator('[data-move="40"]').focus();
  // Right twice from the centre of the centre board: its right-hand cell, then across into the
  // right-hand board
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-move="41"]')).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-move="48"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-move="48"]')).toHaveAttribute("data-mark", "1");
});

test("a hint highlights a legal move", async ({ page }) => {
  await page.goto("./");
  const hint = page.locator("[data-hint]");
  await expect(hint).toBeEnabled({ timeout: 45_000 });
  await hint.click();
  await expect(page.locator(".cell[data-hint]")).toHaveCount(1, { timeout: 45_000 });
  await expect(page.locator("[data-detail]")).toContainText("Pista: juega en el tablero");
});

test("playing O lets the computer open the game", async ({ page }) => {
  await page.goto("./en/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByText("O, the computer starts").click();
  await expect(marks(page)).toHaveCount(1, { timeout: 45_000 });
  await expect(page.locator("[data-status]")).toHaveText("Your turn");
});
