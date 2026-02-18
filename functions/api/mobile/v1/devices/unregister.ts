import {
  corsOptionsResponse,
  errorResponse,
  getRequestId,
  jsonResponse,
  parseJsonBody,
  unregisterDevice,
  validateUnregisterPayload,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestDelete(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  try {
    const parsed = await parseJsonBody<{ installId?: string }>(context.request, requestId);
    if (!parsed.ok) {
      return parsed.response as Response;
    }

    const validated = validateUnregisterPayload(parsed.value);
    if (!validated.ok) {
      return errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
      });
    }

    const removed = await unregisterDevice(context.env, validated.installId);
    if (!removed) {
      return errorResponse(404, "device_not_found", "Device not found", { requestId });
    }

    return jsonResponse({
      ok: true,
      installId: validated.installId,
      meta: { requestId },
    });
  } catch (error) {
    return errorResponse(500, "device_unregister_failed", "Failed to unregister device", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
}
