import {
  cachedFlares,
  corsOptionsResponse,
  fetchFlareTimeline,
  jsonResponse,
  persistFlares,
  type MobileEnv,
} from "./_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestGet(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const url = new URL(context.request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitParam) ? limitParam : 50));

  try {
    const timeline = await fetchFlareTimeline(limit);
    await persistFlares(context.env, timeline);
    return jsonResponse({ items: timeline, limit });
  } catch (error) {
    const cached = await cachedFlares(context.env, limit);
    if (cached.length > 0) {
      return jsonResponse({ items: cached, limit, source: "cached" });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to fetch flare timeline", error: message }, { status: 500 });
  }
}
