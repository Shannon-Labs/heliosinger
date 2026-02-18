import type { DeviceRegistrationRequest } from "../../../../../packages/core/src/index.ts";
import {
  corsOptionsResponse,
  getDefaultPreferences,
  jsonResponse,
  registerDevice,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestPost(context: { request: Request; env: MobileEnv }): Promise<Response> {
  try {
    const body = (await context.request.json()) as Partial<DeviceRegistrationRequest>;

    if (!body.installId || !body.pushToken || !body.timezone || !body.platform) {
      return jsonResponse(
        { message: "installId, pushToken, timezone, and platform are required" },
        { status: 400 }
      );
    }

    const payload: DeviceRegistrationRequest = {
      installId: body.installId,
      pushToken: body.pushToken,
      timezone: body.timezone,
      platform: body.platform,
      appVersion: body.appVersion,
      preferences: body.preferences ?? getDefaultPreferences(body.installId),
    };

    await registerDevice(context.env, payload);
    return jsonResponse({ ok: true, installId: payload.installId, registeredAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to register device", error: message }, { status: 500 });
  }
}
