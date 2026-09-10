// Dedicated event evaluation process: backend imports and shared budget survive UI HMR.
// Supply credentials through the existing ignored env file via Node's --env-file flag.
import { createServer } from "vite";
import { createAstraMiddleware } from "../server/astra.js";
import { createListingSearchMiddleware } from "../server/listing-search.js";
import { createListingEvidenceMiddleware } from "../server/listing-evidence.js";
import { createPlanInspectionMiddleware } from "../server/plan-inspection.js";
import { createProviderBudget } from "../server/provider-budget.js";
const budget = createProviderBudget({ maxAttempts: 8 });
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Existing project access is not configured.");
const middlewares = [
  createPlanInspectionMiddleware({ apiKey, fetchFn: budget.fetchFn }),
  createListingEvidenceMiddleware({
    apiKey,
    fetchImpl: budget.fetchFn,
    maxAttempts: 8,
  }),
  createListingSearchMiddleware({ apiKey, fetchImpl: budget.fetchFn }),
  createAstraMiddleware({ apiKey, fetchImpl: budget.fetchFn }),
];
const server = await createServer({
  configFile: false,
  root: new URL("..", import.meta.url).pathname,
  server: { host: "127.0.0.1", port: 5175, strictPort: true },
  plugins: [
    {
      name: "bounded-event-evaluation",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== "/api/evaluation/status") return next();
          if (req.headers.host !== "127.0.0.1:5175" || req.method !== "GET") {
            res.writeHead(403).end();
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(budget.snapshot()));
        });
        for (const middleware of middlewares)
          server.middlewares.use(middleware);
      },
    },
  ],
});
await server.listen();
console.log(
  "Elsewhere bounded evaluation: http://127.0.0.1:5175 · 8 total provider attempts across all stages; no automatic retries.",
);
