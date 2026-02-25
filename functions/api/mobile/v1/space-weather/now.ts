import {
  cachedSnapshot,
  captureApiError,
  corsOptionsResponse,
  createRequestLogger,
  enforceRateLimit,
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
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-space-weather-now-get",
    limit: 120,
    windowSeconds: 60,
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/space-weather/now",
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
    const payload = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, payload);
    const response = jsonResponse(
      {
        ...payload,
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
      route: "/api/mobile/v1/space-weather/now",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp,
    });
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      const response = jsonResponse(
        {
          ...snapshotWithCurrentStaleness(cached, "cached"),
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

    const response = errorResponse(500, "space_weather_now_failed", "Failed to fetch latest space weather", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers,
    });
    completeRequest(500, { errorCode: "space_weather_now_failed" });
    return response;
  }
}
