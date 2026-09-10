import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evidenceCapabilities } from "../src/evidence-readiness.js";
import { normalizeSourceUrl } from "../src/source-policy.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(args) {
  const options = {
    maxCalls: 2,
    holdouts: false,
    baseUrl: "http://127.0.0.1:5173",
  };
  const names = {
    "--suite": "suite",
    "--output": "output",
    "--max-calls": "maxCalls",
    "--base-url": "baseUrl",
  };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error("Duplicate option.");
    seen.add(flag);
    if (flag === "--holdouts") {
      options.holdouts = true;
      continue;
    }
    if (!names[flag] || !args[i + 1] || args[i + 1].startsWith("--"))
      throw new Error("Unknown option or missing value.");
    options[names[flag]] = args[++i];
  }
  if (!options.suite || !options.output)
    throw new Error("--suite and --output are required.");
  if (!/^[0-8]$/.test(String(options.maxCalls)))
    throw new Error("--max-calls must be an integer from 0 to 8.");
  options.maxCalls = Number(options.maxCalls);
  if (!/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}\/?$/.test(options.baseUrl))
    throw new Error(
      "--base-url must be a local HTTP origin at 127.0.0.1 with a port.",
    );
  try {
    options.baseUrl = new URL(options.baseUrl).origin;
  } catch {
    throw new Error("Invalid local port.");
  }
  return options;
}

export function requestForCase(item) {
  if (
    typeof item.address_input !== "string" ||
    !item.address_input.trim() ||
    !(item.unit_input == null || typeof item.unit_input === "string")
  )
    throw new Error("Invalid case identity.");
  const address =
    item.address_input + (item.unit_input ? ` unit ${item.unit_input}` : "");
  if (
    address.length < 3 ||
    address.length > 180 ||
    /[\x00-\x1f\x7f]/.test(address)
  )
    throw new Error("Invalid case identity.");
  return { address, sourceUrl: item.source_urls?.[0] ?? null };
}

function sourceAllowed(url) {
  try {
    return (
      new URL(normalizeSourceUrl(url)).pathname.replace(/\//g, "").length > 0
    );
  } catch {
    return false;
  }
}

const count = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;

export function responseRecord(body) {
  if (
    !body ||
    !Array.isArray(body.sources) ||
    body.sources.some(
      (s) => !s || typeof s.url !== "string" || !sourceAllowed(s.url),
    )
  )
    throw new Error("Invalid evidence response.");
  return {
    readiness: typeof body.readiness === "string" ? body.readiness : null,
    capabilities: evidenceCapabilities(body.sources),
    returned_refs: body.sources.map(
      ({ url, title, scope, level, kind, publishedAt }) => ({
        url,
        title,
        scope,
        level,
        kind,
        publishedAt,
      }),
    ),
    observed_at: body.observedAt ?? null,
    provider: {
      request_id: /^resp_[A-Za-z0-9_-]{1,160}$/.test(body.requestId ?? "")
        ? body.requestId
        : null,
      model: /^gpt-6-astra(?:-[a-z0-9-]+)?$/.test(body.model ?? "")
        ? body.model
        : null,
      usage: {
        input_tokens: count(
          body.usage?.inputTokens ?? body.usage?.input_tokens,
        ),
        output_tokens: count(
          body.usage?.outputTokens ?? body.usage?.output_tokens,
        ),
        cached_input_tokens: count(
          body.usage?.cachedTokens ??
            body.usage?.cachedInputTokens ??
            body.usage?.input_tokens_details?.cached_tokens,
        ),
      },
      tool_calls: count(body.toolCalls),
    },
    local_result_replay: typeof body.cached === "boolean" ? body.cached : null,
    cache_note:
      "The endpoint cached marker denotes local result replay. Token usage belongs to the original provider response; missing cached-token usage is unknown.",
  };
}

export function summarize(records) {
  return {
    attempted: records.filter((r) => r.attempts > 0).length,
    completed: records.filter((r) => r.status === "completed_source_report")
      .length,
    blocked: records.filter((r) => r.status === "blocked_source_policy").length,
    not_run: records.filter((r) => r.status === "not_run_budget").length,
    failed: records.filter((r) => r.status === "failed").length,
  };
}

export async function evaluateSuite(
  suite,
  options,
  {
    fetchImpl = fetch,
    now = () => new Date(),
    monotonic = () => performance.now(),
    code = {},
    checkpoint = async () => {},
  } = {},
) {
  if (
    !Array.isArray(suite.cases) ||
    !Number.isInteger(options.maxCalls) ||
    options.maxCalls < 0 ||
    options.maxCalls > 8
  )
    throw new Error("Invalid suite or call budget.");
  const split = options.holdouts ? "held_out_acceptance" : "iteration";
  const selected = suite.cases.filter((item) => item.split === split);
  if (
    new Set(selected.map((item) => item.case_id)).size !== selected.length ||
    selected.some((item) => typeof item.case_id !== "string")
  )
    throw new Error("Cases require unique string identifiers.");
  const run = {
    schema_version: 1,
    run_id: randomUUID(),
    suite_id: suite.suite_id ?? null,
    split,
    input_mode: "source_seeded",
    code,
    max_http_calls: options.maxCalls,
    started_at: now().toISOString(),
    ended_at: null,
    positive_geometry_not_evaluated: true,
    limitations: [
      "Source-seeded evidence search only; address-only discovery, media inspection and geometry acceptance were not run.",
      "Completed source reports are not reconstruction successes. Assertions require separate review.",
      "No retries or service restarts. The HTTP budget does not override the service provider-attempt cap.",
    ],
    cases: selected.map((item) => ({
      case_id: item.case_id,
      input_mode: "source_seeded",
      request: requestForCase(item),
      status: "not_run_budget",
      attempts: 0,
      started_at: null,
      ended_at: null,
      latency_ms: null,
      http_status: null,
      error: null,
      stages: {
        address_only_discovery: "not_run_source_seeded",
        source_evidence_search: "not_run",
        media_inspection: "not_evaluated",
        accepted_geometry: "not_evaluated",
      },
      expected: {
        positive_assertions:
          item.reference_expectations?.positive_assertions ?? [],
        prohibited_assertions:
          item.reference_expectations?.prohibited_assertions ?? [],
        assertion_review: "not_evaluated",
      },
      positive_geometry_not_evaluated: true,
    })),
  };
  let calls = 0;
  for (const record of run.cases) {
    if (!sourceAllowed(record.request.sourceUrl)) {
      record.status = "blocked_source_policy";
      record.stages.source_evidence_search = "blocked_source_policy";
      record.error =
        "The first source URL is unsupported by the current shared source policy.";
    } else if (calls < options.maxCalls) {
      calls++;
      record.attempts = 1;
      record.started_at = now().toISOString();
      const started = monotonic();
      try {
        const response = await fetchImpl(
          `${options.baseUrl}/api/listings/evidence`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: options.baseUrl,
            },
            body: JSON.stringify(record.request),
            signal: AbortSignal.timeout(55000),
          },
        );
        record.http_status = response.status;
        if (!response.ok) {
          record.status = "failed";
          record.error = `Evidence endpoint returned HTTP ${response.status}. Response error text omitted.`;
        } else {
          Object.assign(record, responseRecord(await response.json()));
          record.status = "completed_source_report";
        }
      } catch (error) {
        record.status = "failed";
        record.error =
          error?.name === "TimeoutError" || error?.name === "AbortError"
            ? "Evidence request timed out; provider completion is unknown. No retry was made."
            : "Evidence request failed or returned an invalid report. Error details omitted.";
      }
      record.latency_ms = Math.round((monotonic() - started) * 1000) / 1000;
      record.ended_at = now().toISOString();
      record.stages.source_evidence_search = record.status;
    }
    run.summary = summarize(run.cases);
    await checkpoint(run);
  }
  run.ended_at = now().toISOString();
  run.summary = summarize(run.cases);
  await checkpoint(run);
  return run;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputParent = await realpath(dirname(resolve(options.output)));
  const output = resolve(
    outputParent,
    resolve(options.output).split("/").at(-1),
  );
  const rel = relative(await realpath(repository), output);
  if (!rel.startsWith(".." + "/") && !isAbsolute(rel))
    throw new Error("--output must be outside the repository.");
  const suite = JSON.parse(await readFile(options.suite, "utf8"));
  const code = {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim(),
    dirty: Boolean(
      execFileSync("git", ["status", "--porcelain"], {
        cwd: repository,
        encoding: "utf8",
      }).trim(),
    ),
  };
  // Exclusive creation rejects existing output files and symlinks before any requests.
  await writeFile(output, "{}\n", { flag: "wx", mode: 0o600 });
  const run = await evaluateSuite(suite, options, {
    code,
    checkpoint: (value) =>
      writeFile(output, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 }),
  });
  process.stdout.write(JSON.stringify({ output, ...run.summary }) + "\n");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    process.stderr.write(
      "Evaluation failed. Check arguments, suite, local service and a new output path outside the repository. No automatic retry.\n",
    );
    process.exitCode = 1;
  });
}
