import { defineConfig, loadEnv } from "vite";
import { createAstraMiddleware } from "./server/astra.js";
import { createListingSearchMiddleware } from "./server/listing-search.js";
import { createPlanInspectionMiddleware } from "./server/plan-inspection.js";
import { createListingEvidenceMiddleware } from "./server/listing-evidence.js";
import { createLocationMiddleware } from "./server/location.js";
import { createCommuteMiddleware } from "./server/commute-view/provider.js";
import { createSourcePlanMiddleware } from "./server/source-plan.js";
export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    process.env.ELSEWHERE_ENV_DIR || process.cwd(),
    "OPENAI_",
  );
  const middleware = createAstraMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const planInspection = createPlanInspectionMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const listingEvidence = createListingEvidenceMiddleware({
    maxAttempts: Number(process.env.ELSEWHERE_EVIDENCE_BUDGET || 2),
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const listingSearch = createListingSearchMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const location = createLocationMiddleware();
  const commute = createCommuteMiddleware();
  const sourcePlan = createSourcePlanMiddleware();
  return {
    // Prepare the lazy parser at startup so the first Plans open does not
    // trigger a development-server reload and discard the current selection.
    optimizeDeps: { include: ["pdfjs-dist/build/pdf.mjs"] },
    plugins: [
      {
        name: "elsewhere-local-astra",
        configureServer(server) {
          server.middlewares.use(sourcePlan);
          server.middlewares.use(commute);
          server.middlewares.use(location);
          server.middlewares.use(planInspection);
          server.middlewares.use(listingEvidence);
          server.middlewares.use(listingSearch);
          server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(sourcePlan);
          server.middlewares.use(commute);
          server.middlewares.use(location);
          server.middlewares.use(planInspection);
          server.middlewares.use(listingEvidence);
          server.middlewares.use(listingSearch);
          server.middlewares.use(middleware);
        },
      },
    ],
  };
});
