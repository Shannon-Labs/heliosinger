import {
  corsOptionsResponse,
  jsonResponse,
  unregisterDevice,
  type MobileEnv,
} from "../_lib";

export async function onRequestOptions(): Promise<Response> {
  return corsOptionsResponse();
}

export async function onRequestDelete(context: { request: Request; env: MobileEnv }): Promise<Response> {
  try {
    const body = (await context.request.json().catch(() => ({}))) as { installId?: string };
    if (!body.installId) {
      return jsonResponse({ message: "installId is required" }, { status: 400 });
    }

    const removed = await unregisterDevice(context.env, body.installId);
    if (!removed) {
      return jsonResponse({ message: "Device not found" }, { status: 404 });
    }

    return jsonResponse({ ok: true, installId: body.installId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ message: "Failed to unregister device", error: message }, { status: 500 });
  }
}
