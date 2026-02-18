import {
  cachedSnapshot,
  corsOptionsResponse,
  fetchLatestSpaceWeather,
  getLearningContext,
  jsonResponse,
  persistSnapshot,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestGet(context: { env: MobileEnv }): Promise<Response> {
  try {
    const now = await fetchLatestSpaceWeather();
    await persistSnapshot(context.env, now);
    const cards = getLearningContext(now);

    return jsonResponse({
      timestamp: new Date().toISOString(),
      source: now.source,
      condition: now.condition,
      cards,
    });
  } catch (error) {
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      return jsonResponse({
        timestamp: new Date().toISOString(),
        source: "cached",
        condition: cached.condition,
        cards: getLearningContext(cached),
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to build learning context", error: message }, { status: 500 });
  }
}
