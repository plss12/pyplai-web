import { expect, test, type Page } from "@playwright/test";

const marks = (page: Page) => page.locator(".cell[data-mark]");
const dialog = (page: Page) => page.locator("[data-new-game-dialog]");

/** Pick a side and a level in the new game dialog and start. */
async function start(page: Page, side: string, level: string, startLabel = "Empezar"): Promise<void> {
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByText(side).click();
  await dialog(page).getByText(level, { exact: true }).click();
  await dialog(page).getByRole("button", { name: startLabel }).click();
  await expect(dialog(page)).toBeHidden();
}

test("the player moves and pyplAI answers in the browser", async ({ page }) => {
  await page.goto("./");
  await start(page, "X, empiezas tú", "Medio");
  await expect(page.locator("[data-status]")).toHaveText("Te toca");
  await page.locator('[data-move="40"]').click();
  // Pyodide loads, the worker runs MCTS and the computer's move appears
  await expect(marks(page)).toHaveCount(2, { timeout: 45_000 });
  await expect(page.locator("[data-status]")).toHaveText("Te toca");
  await expect(page.locator("[data-detail]")).toContainText("La IA ha jugado en el tablero central");
});

test("the board can be played with the keyboard", async ({ page }) => {
  await page.goto("./");
  await start(page, "X, empiezas tú", "Medio");
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
  await start(page, "X, empiezas tú", "Medio");
  const hint = page.locator("[data-hint-button]");
  await expect(hint).toBeEnabled({ timeout: 45_000 });
  await hint.click();
  const hinted = page.locator(".cell[data-hint]");
  await expect(hinted).toHaveCount(1, { timeout: 45_000 });
  // Its own paragraph, with the label in bold
  await expect(page.locator("[data-hint-text] strong")).toHaveText("Pista:");
  await expect(page.locator("[data-hint-text]")).toContainText("juega en el tablero");
  // The win rate comes with the number of simulations behind it
  await expect(page.locator("[data-hint-text]")).toContainText(/de victorias en \d+ simulaci/);
  // No second hint in the same turn
  await expect(hint).toBeDisabled();
  // Playing the hint ends the turn; once the computer answers, a new hint is available
  await hinted.click();
  await expect(marks(page)).toHaveCount(2, { timeout: 45_000 });
  await expect(page.locator("[data-hint-text]")).toBeHidden();
  await expect(hint).toBeEnabled();
});

test("side and level are set in the dialog and fixed during the game", async ({ page }) => {
  await page.goto("./en/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await start(page, "O, the computer starts", "Hard", "Start");
  // The computer plays X and opens the game
  await expect(marks(page)).toHaveCount(1, { timeout: 45_000 });
  await expect(page.locator("[data-status]")).toHaveText("Your turn");
  await expect(page.locator("[data-current-game]")).toHaveText("Hard level, You play O");
  // Outside the dialog there is nothing to change them with
  await expect(page.locator('main input[name="level"], main input[name="side"]')).toHaveCount(0);
});

test("Escape keeps the game in progress, and the last choice is remembered", async ({ page }) => {
  await page.goto("./");
  await start(page, "O, empieza la IA", "Difícil");
  await expect(marks(page)).toHaveCount(1, { timeout: 45_000 });

  const newGame = page.getByRole("button", { name: "Nueva partida" });
  await newGame.click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(newGame).toBeFocused();
  await expect(marks(page)).toHaveCount(1);

  await page.reload();
  await expect(dialog(page).locator('input[name="side"][value="2"]')).toBeChecked();
  await expect(dialog(page).locator('input[name="level"][value="hard"]')).toBeChecked();
});
