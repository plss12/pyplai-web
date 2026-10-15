/// <reference types="vitest/config" />
// getViteConfig applies Astro's Vite setup, including the @/ alias from tsconfig.json
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
