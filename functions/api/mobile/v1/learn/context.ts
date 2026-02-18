import {
  cachedSnapshot,
  corsOptionsResponse,
  errorResponse,
  fetchLatestSpaceWeather,
  getRequestId,
  getLearningContext,
  jsonResponse,
  persistSnapshot,
  snapshotWithCurrentStaleness,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestGet(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  try {
    const now = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, now);
    const cards = getLearningContext(now);

    return jsonResponse({
      timestamp: new Date().toISOString(),
      source: now.source,
      condition: now.condition,
      cards,
      meta: {
        requestId,
        source: "live",
        storage,
      },
    });
  } catch (error) {
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      const staleSnapshot = snapshotWithCurrentStaleness(cached, "cached");
      return jsonResponse({
        timestamp: new Date().toISOString(),
        source: "cached",
        condition: staleSnapshot.condition,
        cards: getLearningContext(staleSnapshot),
        meta: {
          requestId,
          source: "cached",
        },
      });
    }

    return errorResponse(500, "learning_context_failed", "Failed to build learning context", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
}
