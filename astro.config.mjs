// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://plss12.github.io',
  // GitHub Pages serves the repository under /pyplai-web/
  base: '/pyplai-web',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
    // The worker imports Pyodide at run time from public/pyodide, not through the bundler
    worker: { format: 'es' },
  },
});
