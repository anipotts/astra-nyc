import { buildingRequest, buildingQueryUrl, normalizeBuildings } from "./data.js";

const abortError = () => new DOMException("Building request cancelled.", "AbortError");

async function readJson(response, maxBytes) {
  if (!response.ok) throw new Error(`NYC building service unavailable (${response.status}).`);
  if (!/json/i.test(response.headers.get("content-type") ?? "")) throw new Error("NYC building service returned unsupported content.");
  if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("NYC building response exceeds the size limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("NYC building response has no body.");
  let bytes = 0, body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new Error("NYC building response exceeds the size limit."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } finally { reader.releaseLock(); }
}

export function createNycBuildingClient({ fetchFn = globalThis.fetch, now = Date.now,
  timeoutMs = 8000, cacheTtlMs = 30 * 60 * 1000, maxCacheEntries = 8, maxBytes = 6_000_000 } = {}) {
  const cache = new Map();
  const timeout = Math.max(1, Math.min(12000, timeoutMs));
  const byteLimit = Math.max(1, Math.min(6_000_000, maxBytes));
  return {
    async load(location, { signal, radiusMeters, limit, refresh = false } = {}) {
      if (signal?.aborted) throw abortError();
      const request = buildingRequest(location, { radiusMeters, limit });
      const key = buildingQueryUrl(request);
      const stored = cache.get(key);
      if (!refresh && stored && now() - stored.at < cacheTtlMs) {
        cache.delete(key); cache.set(key, stored);
        return { ...stored.result, request, cached: true };
      }
      if (stored) cache.delete(key);
      const controller = new AbortController();
      let rejectAbort, timedOut = false;
      const cancellation = new Promise((_, reject) => { rejectAbort = reject; });
      const cancel = () => { controller.abort(); rejectAbort(abortError()); };
      signal?.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => {
        timedOut = true; controller.abort(); rejectAbort(new Error("NYC building request timed out."));
      }, timeout);
      try {
        const payload = await Promise.race([
          (async () => readJson(await fetchFn(key, { signal: controller.signal, credentials: "omit", mode: "cors", redirect: "error" }), byteLimit))(),
          cancellation,
        ]);
        if (controller.signal.aborted) throw timedOut ? new Error("NYC building request timed out.") : abortError();
        const result = normalizeBuildings(payload, request, { fetchedAt: new Date(now()).toISOString() });
        cache.set(key, { at: now(), result });
        while (cache.size > Math.max(1, Math.min(8, maxCacheEntries))) cache.delete(cache.keys().next().value);
        return result;
      } catch (error) {
        controller.abort(); // Stop a rejected/oversized response body as well.
        if (timedOut) throw new Error("NYC building request timed out.");
        throw error;
      } finally {
        clearTimeout(timer); signal?.removeEventListener("abort", cancel);
      }
    },
    clear() { cache.clear(); },
  };
}
