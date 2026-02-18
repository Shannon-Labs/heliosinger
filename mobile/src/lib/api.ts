import type {
  DevicePreferencesRequest,
  DeviceRegistrationRequest,
  FlareTimelineItem,
  LearningCard,
  SpaceWeatherNowResponse,
} from "@heliosinger/core";
import { API_BASE_URL, API_PATHS } from "./config";

interface ErrorPayload {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

export class MobileApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let payload: ErrorPayload | null = null;
    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      // ignore parsing errors
    }

    throw new MobileApiError(
      payload?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.code
    );
  }

  return (await response.json()) as T;
}

export async function fetchNow(): Promise<SpaceWeatherNowResponse> {
  return fetchJson<SpaceWeatherNowResponse>(API_PATHS.now);
}

export async function fetchFlares(limit = 50): Promise<FlareTimelineItem[]> {
  const payload = await fetchJson<{ items: FlareTimelineItem[] }>(`${API_PATHS.flares}?limit=${limit}`);
  return payload.items;
}

export async function fetchLearningCards(): Promise<LearningCard[]> {
  const payload = await fetchJson<{ cards: LearningCard[] }>(API_PATHS.learn);
  return payload.cards;
}

export async function registerDevice(payload: DeviceRegistrationRequest): Promise<void> {
  await fetchJson(API_PATHS.register, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePreferences(payload: DevicePreferencesRequest): Promise<void> {
  await fetchJson(API_PATHS.preferences, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function unregisterDevice(installId: string): Promise<void> {
  await fetchJson(API_PATHS.unregister, {
    method: "DELETE",
    body: JSON.stringify({ installId }),
  });
}
