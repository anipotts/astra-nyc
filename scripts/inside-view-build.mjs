import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = await mkdtemp(join(tmpdir(), 'elsewhere-inside-build-'));
await build({
  configFile: false,
  root,
  build: { outDir, emptyOutDir: false, rolldownOptions: { input: fileURLToPath(new URL('./inside-view-harness.html', import.meta.url)) } },
});
console.log(`Isolated Inside build: ${outDir}`);
