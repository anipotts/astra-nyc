// A single run budget shared across all provider-backed stages, including failures.
export function createProviderBudget({
  maxAttempts = 8,
  fetchFn = fetch,
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 8)
    throw new Error("Run budget must be 1–8 provider attempts.");
  let attempts = 0;
  return {
    snapshot: () => ({
      providerAttempts: attempts,
      maxAttempts,
      remaining: maxAttempts - attempts,
    }),
    fetchFn: async (url, options) => {
      if (new URL(url).origin === "https://api.openai.com") {
        if (attempts >= maxAttempts) return new Response("", { status: 429 });
        attempts++;
      }
      return fetchFn(url, options);
    },
  };
}
