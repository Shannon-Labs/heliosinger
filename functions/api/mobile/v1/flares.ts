import {
  cachedFlares,
  corsOptionsResponse,
  errorResponse,
  fetchFlareTimeline,
  getRequestId,
  jsonResponse,
  parseFlaresLimit,
  persistFlares,
  type MobileEnv,
} from "./_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestGet(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  const url = new URL(context.request.url);
  const limit = parseFlaresLimit(url.searchParams.get("limit"));

  try {
    const timeline = await fetchFlareTimeline(limit);
    if (timeline.length > 0) {
      const storage = await persistFlares(context.env, timeline);
      return jsonResponse({
        items: timeline,
        limit,
        source: "live",
        meta: {
          requestId,
          source: "live",
          storage,
        },
      });
    }

    const cached = await cachedFlares(context.env, limit);
    if (cached.length > 0) {
      return jsonResponse({
        items: cached,
        limit,
        source: "cached",
        meta: {
          requestId,
          source: "cached",
        },
      });
    }

    return jsonResponse({
      items: [],
      limit,
      source: "live",
      meta: {
        requestId,
        source: "live",
      },
    });
  } catch (error) {
    return errorResponse(500, "flare_timeline_failed", "Failed to fetch flare timeline", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
}
