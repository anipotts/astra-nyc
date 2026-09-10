import { createHash } from 'node:crypto';
import { normalizeSourceUrl } from '../src/source-policy.js';
import { listings } from '../src/listings.js';
import { nycListings } from '../src/nyc-listings.js';

export const MAX_PLAN_BYTES = 4 * 1024 * 1024;
const defaults = [...listings, ...nycListings].map((item) => item.planUrl).filter((url) => url && /\.pdf(?:[?#]|$)/i.test(url));
const fail = (message, status = 502) => Object.assign(new Error(message), { status });

export function approvedPlanUrl(value, allowedUrls = defaults) {
  const url = normalizeSourceUrl(value);
  if (!allowedUrls.includes(url)) throw fail('This document is not an approved published PDF plan. Open its publisher link.', 400);
  return url;
}

export async function fetchSourcePlan(sourceUrl, { fetchFn = fetch, signal } = {}) {
  const deadline = AbortSignal.timeout(15000);
  const bounded = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const host = new URL(sourceUrl).hostname;
  let current = sourceUrl;
  for (let count = 0; count <= 2; count++) {
    const response = await fetchFn(current, { redirect: 'manual', credentials: 'omit', signal: bounded, headers: { Accept: 'application/pdf' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (count === 2) throw fail('The publisher redirected too many times.');
      const location = response.headers.get('location');
      if (!location || /[\s\\\x00-\x1f\x7f]/.test(location)) throw fail('The publisher returned an unsupported redirect.');
      const raw = /^[a-z][a-z0-9+.-]*:/i.test(location) ? location : location.startsWith('//') ? `https:${location}` : new URL(location, current).href;
      try { current = normalizeSourceUrl(raw); } catch { throw fail('The publisher redirected outside the approved source.'); }
      if (new URL(current).hostname !== host || !/\.pdf$/i.test(new URL(current).pathname)) throw fail('The publisher redirected outside the approved PDF host.');
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw fail(`The publisher could not serve the plan (HTTP ${response.status}).`); }
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (mime !== 'application/pdf') { await response.body?.cancel(); throw fail('The publisher returned a webpage instead of a PDF.'); }
    if (Number(response.headers.get('content-length')) > MAX_PLAN_BYTES) { await response.body?.cancel(); throw fail('This PDF exceeds the 4 MB preview limit.', 413); }
    const reader = response.body?.getReader();
    if (!reader) throw fail('The publisher returned an empty document.');
    const chunks = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_PLAN_BYTES) throw fail('This PDF exceeds the 4 MB preview limit.', 413);
        chunks.push(Buffer.from(part.value));
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw fail('The source did not contain a valid PDF signature.');
    return { bytes, finalUrl: current, fetchedAt: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex') };
  }
}

export function createSourcePlanMiddleware({ fetchFn = fetch, allowedUrls = defaults } = {}) {
  let active = 0;
  const json = (res, code, message) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: message })); };
  return async (req, res, next) => {
    if (req.url !== '/api/plans/source') return next();
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '') || req.headers.origin !== `http://${req.headers.host}`)
      return json(res, 403, 'Use the local app to preview source plans.');
    if (req.method !== 'POST') return json(res, 405, 'Use POST to request a source plan.');
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return json(res, 400, 'Use a JSON source-plan request.');
    if (active >= 2) return json(res, 429, 'Two source previews are loading. Try again shortly.');
    const abort = new AbortController();
    const close = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', close);
    active++;
    try {
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 2048) throw fail('The source-plan request is too large.', 413);
        chunks.push(Buffer.from(chunk));
      }
      let value;
      try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('Invalid source-plan request.', 400); }
      if (!value || Object.keys(value).length !== 1 || typeof value.sourceUrl !== 'string') throw fail('Supply only the published plan URL.', 400);
      const sourceUrl = approvedPlanUrl(value.sourceUrl, allowedUrls);
      const result = await fetchSourcePlan(sourceUrl, { fetchFn, signal: abort.signal });
      if (abort.signal.aborted) return;
      res.writeHead(200, {
        'Content-Type': 'application/pdf', 'Content-Length': result.bytes.length, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'X-Plan-Source': result.finalUrl,
        'X-Plan-Fetched-At': result.fetchedAt, 'X-Plan-SHA256': result.sha256,
      });
      res.end(result.bytes);
    } catch (error) {
      if (!abort.signal.aborted) json(res, error.status || 502, error.status ? error.message : 'The source preview could not load within its limits. Open the publisher plan.');
    } finally { active--; res.off('close', close); }
  };
}
