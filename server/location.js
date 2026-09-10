import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  writeFile,
  rename,
  unlink,
  lstat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LOCATION_BOUNDS,
  LOCATION_ATTRIBUTION,
  validateLocation,
} from "../src/location.js";

// Current policy: https://operations.osmfoundation.org/policies/nominatim/
// Explicit selected public listings only; never autocomplete, bulk work or POI crawling.
const OFFICIAL_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const USER_AGENT =
  "Elsewhere/0.1 (https://github.com/anipotts/astra-nyc; explicit listing location lookup)";
const defaultStateDir = join(
  tmpdir(),
  `elsewhere-location-${process.getuid?.() ?? "local"}`,
);
const pending = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeAddress = (address) =>
  address.normalize("NFKC").trim().replace(/\s+/g, " ");
class LocationError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
async function ensureStateDir(stateDir) {
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const stat = await lstat(stateDir);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error("Unsafe lookup state directory");
}
async function cachedResult(file) {
  try {
    const saved = JSON.parse(await readFile(file, "utf8"));
    if (
      !Number.isFinite(saved.expiresAt) ||
      saved.expiresAt <= Date.now() ||
      !Array.isArray(saved.result?.candidates) ||
      saved.result.candidates.length > 3 ||
      saved.result.requiresChoice !== true
    )
      return null;
    saved.result.candidates = saved.result.candidates.map((value) => {
      const result = validateLocation(value);
      if (!result) throw new Error("Null location");
      return result;
    });
    return saved.result;
  } catch {
    return null;
  }
}
async function saveCache(file, result) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      JSON.stringify({ expiresAt: Date.now() + CACHE_MS, result }),
      { mode: 0o600 },
    );
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

// One lock + last-start timestamp across localhost app processes on this user
// account. The lock covers the entire fetch: one concurrent request at most.
async function acquireGlobalSlot(stateDir) {
  const lock = join(stateDir, "request.lock");
  const waitedAt = Date.now();
  while (true) {
    let handle;
    try {
      handle = await open(lock, "wx", 0o600);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      // Recover only a lock belonging to a process that has actually exited.
      try {
        const owner = JSON.parse(await readFile(lock, "utf8"));
        if (Number.isInteger(owner.pid) && owner.pid > 0) {
          try {
            process.kill(owner.pid, 0);
          } catch (error) {
            if (error.code === "ESRCH") {
              await unlink(lock).catch(() => {});
              continue;
            }
          }
        }
      } catch {}
      if (Date.now() - waitedAt > 12000)
        throw new LocationError(
          "Location lookup is busy. Try again shortly.",
          429,
        );
      await delay(100);
      continue;
    }
    await handle.writeFile(JSON.stringify({ pid: process.pid }));
    await handle.close();
    return async () => {
      await unlink(lock).catch(() => {});
    };
  }
}
async function waitForRateLimit(stateDir) {
  const file = join(stateDir, "next-request-at");
  let next = 0;
  try {
    next = Number(await readFile(file, "utf8"));
  } catch {}
  if (Number.isFinite(next) && next > Date.now()) {
    if (next - Date.now() > 12000)
      throw new LocationError(
        "The location provider requested a pause. Try again later.",
        429,
      );
    await delay(next - Date.now());
  }
  await writeFile(file, String(Date.now() + 1000), { mode: 0o600 });
}
async function extendCooldown(stateDir, milliseconds) {
  const file = join(stateDir, "next-request-at");
  let previous = 0;
  try {
    previous = Number(await readFile(file, "utf8"));
  } catch {}
  await writeFile(
    file,
    String(
      Math.max(
        Number.isFinite(previous) ? previous : 0,
        Date.now() + milliseconds,
      ),
    ),
    { mode: 0o600 },
  );
}
async function readProvider(response) {
  if (!response.body?.getReader)
    throw new LocationError("Location provider returned no readable response.");
  const type = response.headers.get("content-type") ?? "";
  if (!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(type)) {
    await response.body.cancel();
    throw new LocationError(
      "Location provider returned an unsupported response.",
    );
  }
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_OUTPUT_BYTES) {
    await response.body.cancel();
    throw new LocationError("Location provider response was too large.");
  }
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_OUTPUT_BYTES)
        throw new LocationError("Location provider response was too large.");
      parts.push(Buffer.from(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
function candidatesFrom(payload, observedAt) {
  if (!Array.isArray(payload) || payload.length > 3)
    throw new LocationError(
      "Location provider returned an invalid candidate list.",
    );
  const candidates = [];
  const seen = new Set();
  for (const item of payload) {
    if (
      !item ||
      !["node", "way", "relation"].includes(item.osm_type) ||
      !/^[1-9]\d{0,15}$/.test(String(item.osm_id)) ||
      typeof item.lon !== "string" ||
      typeof item.lat !== "string" ||
      !/^-?\d+(?:\.\d+)?$/.test(item.lon) ||
      !/^-?\d+(?:\.\d+)?$/.test(item.lat) ||
      (item.address?.country_code && item.address.country_code !== "us")
    )
      continue;
    try {
      const candidate = validateLocation({
        id: `osm:${item.osm_type}:${item.osm_id}`,
        label: item.display_name,
        longitude: Number(item.lon),
        latitude: Number(item.lat),
        source: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
        observedAt,
        precision: "approximate",
      });
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        candidates.push(candidate);
      }
    } catch {}
  }
  return candidates;
}

export function createLocationMiddleware({
  fetchFn = fetch,
  endpoint = process.env.ELSEWHERE_GEOCODER_URL ?? OFFICIAL_ENDPOINT,
  stateDir = defaultStateDir,
} = {}) {
  // Server configuration can switch a compatible provider without a code update.
  // Request bodies cannot supply an upstream URL or override the limiter.
  const configured = new URL(endpoint);
  if (
    configured.protocol !== "https:" ||
    configured.username ||
    configured.password ||
    configured.search ||
    configured.hash
  )
    throw new Error(
      "Geocoder endpoint must be an HTTPS URL without credentials or query parameters.",
    );
  const send = (res, status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  return async (req, res, next) => {
    if (req.url !== "/api/location") return next();
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? ""))
      return send(res, 403, {
        error: "Location lookup is available only in the local app.",
      });
    if (req.method !== "POST")
      return send(res, 405, { error: "Use POST after choosing a listing." });
    if (
      req.headers.origin !== `http://${req.headers.host}` ||
      !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")
    )
      return send(res, 403, {
        error: "Use the local app to look up a listing location.",
      });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 1024)
          return send(res, 413, { error: "Location request too large." });
        chunks.push(bytes);
      }
      let address;
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          Object.keys(data).length !== 1 ||
          typeof data.address !== "string" ||
          data.address.length > 180 ||
          /[\x00-\x1f\x7f]/.test(data.address)
        )
          throw new Error("Invalid address");
        address = normalizeAddress(data.address);
        if (address.length < 3 || /https?:\/\/|@/.test(address))
          throw new Error("Street address required");
      } catch {
        return send(res, 400, {
          error:
            "Provide the selected listing's public street address (3–180 characters).",
        });
      }
      await ensureStateDir(stateDir);
      const hash = createHash("sha256")
        .update(JSON.stringify([configured.href, address.toLowerCase()]))
        .digest("hex");
      const file = join(stateDir, `${hash}.json`);
      const found = await cachedResult(file);
      if (found) return send(res, 200, { ...found, address, cached: true });
      const key = `${stateDir}:${hash}`;
      const existing = pending.get(key);
      if (existing)
        return send(res, 200, { ...(await existing), address, cached: true });
      if (pending.size >= 8)
        return send(res, 429, {
          error: "Location lookup is busy. Try again shortly.",
        });
      const work = (async () => {
        const release = await acquireGlobalSlot(stateDir);
        let fetched = false;
        try {
          const cached = await cachedResult(file);
          if (cached) return { ...cached, cached: true };
          await waitForRateLimit(stateDir);
          const url = new URL(configured);
          url.search = new URLSearchParams({
            q: address,
            format: "jsonv2",
            limit: "3",
            addressdetails: "1",
            countrycodes: "us",
            viewbox: `${LOCATION_BOUNDS.west},${LOCATION_BOUNDS.north},${LOCATION_BOUNDS.east},${LOCATION_BOUNDS.south}`,
            bounded: "1",
            "accept-language": "en",
          }).toString();
          fetched = true;
          const response = await fetchFn(url.href, {
            method: "GET",
            headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
            redirect: "error",
            credentials: "omit",
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            await response.body?.cancel();
            if (response.status === 429 || response.status === 503) {
              const retry = response.headers.get("retry-after");
              const seconds = /^\d+$/.test(retry ?? "")
                ? Number(retry) * 1000
                : Date.parse(retry) - Date.now();
              await extendCooldown(
                stateDir,
                Number.isFinite(seconds) ? Math.max(60000, seconds) : 60000,
              );
            }
            throw new LocationError(
              "The location provider is unavailable. Try again later.",
              response.status === 429 ? 429 : 502,
            );
          }
          const observedAt = new Date().toISOString();
          const result = {
            address,
            candidates: candidatesFrom(
              await readProvider(response),
              observedAt,
            ),
            requiresChoice: true,
            provider: "Nominatim / OpenStreetMap",
            attribution: LOCATION_ATTRIBUTION,
            observedAt,
            cached: false,
          };
          await saveCache(file, result);
          return result;
        } finally {
          // A full second after completion is conservative even if filesystem
          // latency separated reservation time from the actual request start.
          try {
            if (fetched) await extendCooldown(stateDir, 1000);
          } finally {
            await release();
          }
        }
      })();
      pending.set(key, work);
      try {
        return send(res, 200, await work);
      } finally {
        if (pending.get(key) === work) pending.delete(key);
      }
    } catch (error) {
      return send(res, error instanceof LocationError ? error.status : 502, {
        error:
          error instanceof LocationError
            ? error.message
            : "Location lookup could not be completed. Listing sources remain available.",
      });
    }
  };
}
