import { defineConfig, devices } from "@playwright/test";

// Runs against the production build (npm run build first), served by astro preview
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:4321/pyplai-web/" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx astro preview --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321/pyplai-web/",
    // Always a fresh server, so the tests never run against an old build
    reuseExistingServer: false,
  },
});
