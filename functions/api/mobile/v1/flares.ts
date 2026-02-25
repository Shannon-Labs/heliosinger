import {
  cachedFlares,
  captureApiError,
  corsOptionsResponse,
  createRequestLogger,
  enforceRateLimit,
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
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-flares-get",
    limit: 120,
    windowSeconds: 60,
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/flares",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp,
  });

  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds,
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }

  try {
    const timeline = await fetchFlareTimeline(limit);
    if (timeline.length > 0) {
      const storage = await persistFlares(context.env, timeline);
      const response = jsonResponse(
        {
          items: timeline,
          limit,
          source: "live",
          meta: {
            requestId,
            source: "live",
            storage,
          },
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "live" });
      return response;
    }

    const cached = await cachedFlares(context.env, limit);
    if (cached.length > 0) {
      const response = jsonResponse(
        {
          items: cached,
          limit,
          source: "cached",
          meta: {
            requestId,
            source: "cached",
          },
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "cached" });
      return response;
    }

    const response = jsonResponse(
      {
        items: [],
        limit,
        source: "live",
        meta: {
          requestId,
          source: "live",
        },
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200, { source: "live", empty: true });
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/flares",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp,
      details: { limit },
    });
    const response = errorResponse(500, "flare_timeline_failed", "Failed to fetch flare timeline", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers,
    });
    completeRequest(500, { errorCode: "flare_timeline_failed" });
    return response;
  }
}
