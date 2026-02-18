import {
  cachedSnapshot,
  corsOptionsResponse,
  errorResponse,
  fetchLatestSpaceWeather,
  getRequestId,
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
    const payload = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, payload);
    return jsonResponse({
      ...payload,
      meta: {
        requestId,
        source: "live",
        storage,
      },
    });
  } catch (error) {
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      return jsonResponse({
        ...snapshotWithCurrentStaleness(cached, "cached"),
        meta: {
          requestId,
          source: "cached",
        },
      });
    }

    return errorResponse(500, "space_weather_now_failed", "Failed to fetch latest space weather", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
}
