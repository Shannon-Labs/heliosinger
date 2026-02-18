import {
  cachedSnapshot,
  corsOptionsResponse,
  fetchLatestSpaceWeather,
  jsonResponse,
  persistSnapshot,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestGet(context: { env: MobileEnv }): Promise<Response> {
  try {
    const payload = await fetchLatestSpaceWeather();
    await persistSnapshot(context.env, payload);
    return jsonResponse(payload);
  } catch (error) {
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      return jsonResponse(
        {
          ...cached,
          source: "cached",
          stale: true,
          staleSeconds: cached.staleSeconds,
        },
        { status: 200 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to fetch latest space weather", error: message }, { status: 500 });
  }
}
