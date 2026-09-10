import { createHash } from "node:crypto";
import { validateBedEdit } from "../src/clearance.js";

// Local demo adapter only. Never exposed as a public, unauthenticated API.
export function createAstraMiddleware({ apiKey, fetchImpl = fetch }) {
  const cache = new Map();
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  function send(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/astra/")) return next();
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? ""))
      return send(res, 403, { error: "This demo API is local only." });
    if (req.url === "/api/astra/status" && req.method === "GET")
      return send(res, 200, {
        configured: Boolean(apiKey),
        model: "gpt-6-astra",
        attempts,
        limit: MAX_ATTEMPTS,
      });
    if (req.url !== "/api/astra/edit" || req.method !== "POST")
      return send(res, 404, { error: "Not found." });
    if (
      req.headers.origin !== `http://${req.headers.host}` ||
      !req.headers["content-type"]?.startsWith("application/json")
    )
      return send(res, 403, { error: "Use the local app to request an edit." });
    if (!apiKey)
      return send(res, 503, {
        error:
          "Astra API access is not configured. Local scene controls still work.",
      });
    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 2048)
          return send(res, 413, { error: "Request too large." });
      }
      const data = JSON.parse(body);
      if (
        typeof data.prompt !== "string" ||
        data.prompt.length < 1 ||
        data.prompt.length > 500 ||
        data.scene !== "wall2308-inferred-v2"
      )
        return send(res, 400, {
          error: "Use a short bed-change request in the 95 Wall sketch.",
        });
      const key = createHash("sha256")
        .update(
          JSON.stringify({
            scene: data.scene,
            prompt: data.prompt.trim().toLowerCase(),
          }),
        )
        .digest("hex");
      if (cache.has(key))
        return send(res, 200, { ...(await cache.get(key)), cached: true });
      if (attempts >= MAX_ATTEMPTS)
        return send(res, 429, {
          error:
            "Local demo limit reached (10 model attempts per server start).",
        });
      attempts++;
      const pending = (async () => {
        const response = await fetchImpl(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(45000),
            body: JSON.stringify({
              model: "gpt-6-astra",
              store: false,
              reasoning: { effort: "low" },
              max_output_tokens: 2048,
              instructions:
                "Translate the request into a bounded scene edit. Only resizing the existing bed to king or queen is supported. For any other request return action unsupported. Never invent room measurements or certify fit. The room is an inferred 7 m by 7.631 m sketch with a fixed bed position x=1.7,z=-1.55 metres. King mattress is 1.93 by 2.03 m, queen 1.52 by 2.03 m. The app computes clearance from actual rendered frame/obstacle geometry, not your text.",
              input: data.prompt,
              text: {
                format: {
                  type: "json_schema",
                  name: "bed_edit",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      action: {
                        type: "string",
                        enum: ["resize_bed", "unsupported"],
                      },
                      target: { type: "string", enum: ["existing_bed"] },
                      size: { type: "string", enum: ["king", "queen"] },
                    },
                    required: ["action", "target", "size"],
                  },
                },
              },
            }),
          },
        );
        if (!response.ok)
          throw new Error(
            `Astra request failed (HTTP ${response.status}). Check project access or credit balance; no edit was applied.`,
          );
        const payload = await response.json();
        if (payload.status !== "completed")
          throw new Error(
            "Astra did not complete the edit. The scene is unchanged.",
          );
        const output = payload.output
          ?.flatMap((item) => item.content ?? [])
          .filter((item) => item.type === "output_text")
          .map((item) => item.text)
          .join("");
        let edit;
        try {
          edit = validateBedEdit(JSON.parse(output));
        } catch {
          throw new Error(
            "Astra did not return a supported king/queen bed edit. The scene is unchanged.",
          );
        }
        return {
          edit,
          model: payload.model,
          requestId: payload.id,
          generatedAt: new Date().toISOString(),
          cached: false,
          usage: {
            inputTokens: payload.usage?.input_tokens ?? null,
            outputTokens: payload.usage?.output_tokens ?? null,
          },
        };
      })();
      cache.set(key, pending);
      try {
        send(res, 200, await pending);
      } catch (error) {
        cache.delete(key);
        throw error;
      }
    } catch (error) {
      // Do not echo provider bodies, credentials, or user input into logs/responses.
      const safe = error.message?.startsWith("Astra ")
        ? error.message
        : "The edit request could not be completed. No scene change was applied.";
      send(res, 502, { error: safe });
    }
  };
}
