import type { DevicePreferencesRequest } from "../../../../../packages/core/src/index.ts";
import {
  corsOptionsResponse,
  jsonResponse,
  updateDevicePreferences,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestPut(context: { request: Request; env: MobileEnv }): Promise<Response> {
  try {
    const payload = (await context.request.json()) as DevicePreferencesRequest;

    if (!payload.installId) {
      return jsonResponse({ message: "installId is required" }, { status: 400 });
    }

    const updated = await updateDevicePreferences(context.env, {
      ...payload,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      return jsonResponse({ message: "Device not found" }, { status: 404 });
    }

    return jsonResponse({ ok: true, installId: payload.installId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to update device preferences", error: message }, { status: 500 });
  }
}
