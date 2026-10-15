// Copy the Pyodide runtime from node_modules to public/pyodide, so the site serves it itself
// at the exact version in package-lock.json instead of depending on a CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pyodide/package.json"));
const target = join(import.meta.dirname, "..", "public", "pyodide");
const files = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

mkdirSync(target, { recursive: true });
for (const file of files) copyFileSync(join(source, file), join(target, file));
console.log(`Copied ${files.length} Pyodide files to ${target}`);
