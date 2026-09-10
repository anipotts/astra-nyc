import { createServer } from 'vite';
import { createCommuteMiddleware } from '../../server/commute-view/provider.js';
import { createLocationMiddleware } from '../../server/location.js';
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 5182, strictPort: true }, plugins: [{ name: 'commute-qa', configureServer(server) { server.middlewares.use(createCommuteMiddleware()); server.middlewares.use(createLocationMiddleware()); } }] });
await server.listen();
console.log('Commute QA: http://127.0.0.1:5182/scripts/commute-view/harness.html');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
