import {
  corsOptionsResponse,
  errorResponse,
  getRequestId,
  jsonResponse,
  parseJsonBody,
  updateDevicePreferences,
  validatePreferencesPayload,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestPut(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  try {
    const parsed = await parseJsonBody(context.request, requestId);
    if (!parsed.ok) {
      return parsed.response as Response;
    }

    const validated = validatePreferencesPayload(parsed.value);
    if (!validated.ok) {
      return errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
      });
    }

    const payload = validated.payload;
    const updated = await updateDevicePreferences(context.env, payload);

    if (!updated) {
      return errorResponse(404, "device_not_found", "Device not found", { requestId });
    }

    return jsonResponse({
      ok: true,
      installId: payload.installId,
      meta: { requestId },
    });
  } catch (error) {
    return errorResponse(
      500,
      "device_preferences_update_failed",
      "Failed to update device preferences",
      {
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
      }
    );
  }
}
