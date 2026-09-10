import { defineConfig, loadEnv } from "vite";
import { createAstraMiddleware } from "./server/astra.js";
import { createListingSearchMiddleware } from "./server/listing-search.js";
import { createListingEvidenceMiddleware } from "./server/listing-evidence.js";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "OPENAI_");
  const middleware = createAstraMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const listingEvidence = createListingEvidenceMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  const listingSearch = createListingSearchMiddleware({
    apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
  });
  return {
    plugins: [
      {
        name: "elsewhere-local-astra",
        configureServer(server) {
          server.middlewares.use(listingEvidence);
          server.middlewares.use(listingSearch);
          server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(listingEvidence);
          server.middlewares.use(listingSearch);
          server.middlewares.use(middleware);
        },
      },
    ],
  };
});
