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

test("one hint per turn, shown apart and highlighted on the board", async ({ page }) => {
  await page.goto("./");
  const hint = page.locator("[data-hint-button]");
  await expect(hint).toBeEnabled({ timeout: 45_000 });
  await hint.click();
  const hinted = page.locator(".cell[data-hint]");
  await expect(hinted).toHaveCount(1, { timeout: 45_000 });
  // Its own paragraph, with the label in bold
  await expect(page.locator("[data-hint-text] strong")).toHaveText("Pista:");
  await expect(page.locator("[data-hint-text]")).toContainText("juega en el tablero");
  // No second hint in the same turn
  await expect(hint).toBeDisabled();
  // Playing the hint ends the turn; once the computer answers, a new hint is available
  await hinted.click();
  await expect(marks(page)).toHaveCount(2, { timeout: 45_000 });
  await expect(page.locator("[data-hint-text]")).toBeHidden();
  await expect(hint).toBeEnabled();
});

test("playing O lets the computer open the game", async ({ page }) => {
  await page.goto("./en/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByText("O, the computer starts").click();
  await expect(marks(page)).toHaveCount(1, { timeout: 45_000 });
  await expect(page.locator("[data-status]")).toHaveText("Your turn");
});
