import {
  captureApiError,
  corsOptionsResponse,
  createRequestLogger,
  enforceRateLimit,
  errorResponse,
  getRequestId,
  jsonResponse,
  parseJsonBody,
  unregisterDevice,
  validateUnregisterPayload,
  withHeaders,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestDelete(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-devices-unregister-delete",
    limit: 20,
    windowSeconds: 600,
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/devices/unregister",
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
    const parsed = await parseJsonBody<{ installId?: string }>(context.request, requestId);
    if (!parsed.ok) {
      const response = withHeaders(parsed.response as Response, rateLimit.headers);
      completeRequest(response.status, { errorCode: "invalid_json" });
      return response;
    }

    const validated = validateUnregisterPayload(parsed.value);
    if (!validated.ok) {
      const response = errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
        headers: rateLimit.headers,
      });
      completeRequest(400, { errorCode: validated.failure.code });
      return response;
    }

    const removed = await unregisterDevice(context.env, validated.installId);
    if (!removed) {
      const response = errorResponse(404, "device_not_found", "Device not found", {
        requestId,
        headers: rateLimit.headers,
      });
      completeRequest(404, { errorCode: "device_not_found" });
      return response;
    }

    const response = jsonResponse(
      {
        ok: true,
        installId: validated.installId,
        meta: { requestId },
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200);
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/devices/unregister",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp,
    });
    const response = errorResponse(500, "device_unregister_failed", "Failed to unregister device", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers,
    });
    completeRequest(500, { errorCode: "device_unregister_failed" });
    return response;
  }
}
