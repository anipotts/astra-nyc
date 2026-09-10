import { mkdir, open, readFile, writeFile, unlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeRoute, routeKey, routeRequest } from '../../src/commute-view/route.js';
const ROOT = 'https://routing.openstreetmap.de';
const profiles = { walking: 'foot', bicycling: 'bike', driving: 'car' };
const stateDir = join(tmpdir(), `elsewhere-commute-${process.getuid?.() ?? 'local'}`);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pending = new Map(), cache = new Map();
export function providerUrl(request, root = ROOT) {
  const mode = profiles[request.mode];
  if (!mode) throw new Error('Transit requires external directions.');
  const { origin: a, destination: b } = routeRequest(request);
  // OSRM profiles are fixed by the graph deployment, not the URL's final profile label.
  return `${root}/routed-${mode}/route/v1/${mode}/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson&steps=true&alternatives=false&radiuses=250;250&generate_hints=false`;
}
async function lockProvider() {
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const stat = await lstat(stateDir);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (process.getuid && stat.uid !== process.getuid())) throw new Error('Unsafe route state directory.');
  const path = join(stateDir, 'request.lock');
  const start = Date.now();
  for (;;) {
    try {
      const handle = await open(path, 'wx', 0o600);
      await handle.writeFile(String(process.pid)); await handle.close();
      return async () => { await unlink(path).catch(() => {}); };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const pid = Number(await readFile(path, 'utf8'));
        if (Number.isInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') { await unlink(path).catch(() => {}); continue; } }
        }
      } catch {}
      if (Date.now() - start > 12000) throw new Error('Route service is busy. Try again shortly.');
      await delay(100);
    }
  }
}
async function readJson(response) {
  if (!response.body?.getReader || !/application\/json/i.test(response.headers.get('content-type') || '')) throw new Error('Route provider returned an unsupported response.');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4 * 1024 * 1024) throw new Error('Route response is too large.'); chunks.push(Buffer.from(value)); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) { await reader.cancel().catch(() => {}); throw e; } finally { reader.releaseLock(); }
}
export function createRouteProvider({ fetchFn = fetch, root = process.env.ELSEWHERE_ROUTER_URL || ROOT, gate = lockProvider } = {}) {
  const url = new URL(root);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Routing root must be HTTPS without credentials or query.');
  root = root.replace(/\/$/, '');
  return async function route(value) {
    const request = routeRequest(value), key = root + routeKey(request);
    if (!profiles[request.mode]) throw new Error('Transit itineraries are not connected. Open Google Maps for transit.');
    const existing = cache.get(key);
    if (existing && existing.expires > Date.now()) return { ...existing.result, cached: true };
    if (pending.has(key)) return { ...await pending.get(key), cached: true };
    if (pending.size >= 4) throw new Error('Route service is busy. Try again shortly.');
    const work = (async () => {
      const release = await gate(); let started = false;
      const cooldownFile = join(stateDir, 'next-request-at');
      try {
        // Tests may inject their own gate. Production gate owns this shared state.
        if (gate === lockProvider) {
          let next = 0; try { next = Number(await readFile(cooldownFile, 'utf8')); } catch {}
          if (next - Date.now() > 12000) throw new Error('The route provider requested a pause. Try again later.');
          if (next > Date.now()) await delay(next - Date.now());
        }
        const startedAt = Date.now(); started = true;
        const response = await fetchFn(providerUrl(request, root), { headers: { Accept: 'application/json', 'User-Agent': 'Elsewhere/0.1 (https://github.com/anipotts/astra-nyc; explicit public commute preview)' }, redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(12000) });
        if (!response.ok) {
          await response.body?.cancel();
          if (gate === lockProvider && [429,503].includes(response.status)) {
            const retry = response.headers.get('retry-after');
            const ms = /^\d+$/.test(retry ?? '') ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
            await writeFile(cooldownFile, String(Date.now() + Math.max(60000, Number.isFinite(ms) ? ms : 0)), { mode: 0o600 });
          }
          throw new Error(response.status === 429 ? 'The route provider is busy. Try again later.' : 'No route available from the provider. Try another mode or external directions.');
        }
        const result = normalizeRoute(await readJson(response), request, { latencyMs: Date.now() - startedAt });
        if (cache.size >= 64) cache.delete(cache.keys().next().value);
        cache.set(key, { result, expires: Date.now() + 30 * 60 * 1000 });
        return result;
      } finally {
        try {
          if (started && gate === lockProvider) {
            let next = 0; try { next = Number(await readFile(cooldownFile, 'utf8')); } catch {}
            await writeFile(cooldownFile, String(Math.max(Number.isFinite(next) ? next : 0, Date.now() + 1100)), { mode: 0o600 });
          }
        } finally { await release(); }
      }
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  };
}
export function createCommuteMiddleware(options = {}) {
  const route = createRouteProvider(options);
  return async (req, res, next) => {
    if (req.url !== '/api/commute') return next();
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '') || req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Use the local app for route preview.' });
    if (req.method !== 'POST') return send(405, { error: 'Use POST for an explicit route request.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, { error: 'JSON required.' });
    let request;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 4096) return send(413, { error: 'Route request too large.' }); chunks.push(Buffer.from(chunk)); }
      request = routeRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch { return send(400, { error: 'Choose resolved public locations and a travel mode.' }); }
    if (request.mode === 'transit') return send(422, { error: 'Transit itineraries are available through external directions.' });
    try { send(200, await route(request)); } catch (error) { send(502, { error: error.name === 'TimeoutError' ? 'Route lookup timed out. Try again or open external directions.' : error.message }); }
  };
}
