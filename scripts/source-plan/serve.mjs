import { createServer, build } from 'vite';
import { createSourcePlanMiddleware } from '../../server/source-plan.js';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const config = { root, configFile: false, plugins: [{ name: 'source-plan-harness', configureServer(server) { server.middlewares.use(createSourcePlanMiddleware()); } }] };
if (process.argv.includes('--build')) await build({ ...config, build: { outDir: '/tmp/elsewhere-source-plan-build', emptyOutDir: true, rolldownOptions: { input: fileURLToPath(new URL('./harness.html', import.meta.url)) } } });
else { const server = await createServer({ ...config, server: { host: '127.0.0.1', port: 5181, strictPort: true } }); await server.listen(); server.printUrls(); }
