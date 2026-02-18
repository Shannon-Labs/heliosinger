import {
  corsOptionsResponse,
  errorResponse,
  getDefaultPreferences,
  getRequestId,
  jsonResponse,
  parseJsonBody,
  registerDevice,
  validateRegistrationPayload,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestPost(context: { request: Request; env: MobileEnv }): Promise<Response> {
  const requestId = getRequestId(context.request);
  try {
    const parsed = await parseJsonBody(context.request, requestId);
    if (!parsed.ok) {
      return parsed.response as Response;
    }

    const validated = validateRegistrationPayload(parsed.value);
    if (!validated.ok) {
      return errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
      });
    }

    const payload = {
      ...validated.payload,
      preferences:
        validated.payload.preferences ?? getDefaultPreferences(validated.payload.installId),
    };

    await registerDevice(context.env, payload);
    return jsonResponse(
      {
        ok: true,
        installId: payload.installId,
        registeredAt: new Date().toISOString(),
        meta: { requestId },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(500, "device_registration_failed", "Failed to register device", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
}
