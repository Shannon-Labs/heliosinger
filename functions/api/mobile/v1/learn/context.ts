import {
  cachedSnapshot,
  captureApiError,
  corsOptionsResponse,
  createRequestLogger,
  enforceRateLimit,
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
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-learn-context-get",
    limit: 120,
    windowSeconds: 60,
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/learn/context",
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
    const now = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, now);
    const cards = getLearningContext(now);

    const response = jsonResponse(
      {
        timestamp: new Date().toISOString(),
        source: now.source,
        condition: now.condition,
        cards,
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
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/learn/context",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp,
    });
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      const staleSnapshot = snapshotWithCurrentStaleness(cached, "cached");
      const response = jsonResponse(
        {
          timestamp: new Date().toISOString(),
          source: "cached",
          condition: staleSnapshot.condition,
          cards: getLearningContext(staleSnapshot),
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

    const response = errorResponse(500, "learning_context_failed", "Failed to build learning context", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers,
    });
    completeRequest(500, { errorCode: "learning_context_failed" });
    return response;
  }
}
