import {
  buildImpactBullets,
  buildLearningCards,
  classifyFlareClass,
  computeStaleness,
  deriveRScale,
  deriveSpaceWeatherCondition,
  isValidTimezone,
  normalizePlatform,
  sanitizeFlaresLimit,
  summarizeFlareImpact,
  toFlareTimelineItem,
  validateDevicePreferencesRequest,
  validateDeviceRegistrationRequest,
  type DevicePreferencesRequest,
  type DeviceRegistrationRequest,
  type FlareTimelineItem,
  type LearningCard,
  type SpaceWeatherNowResponse,
  type ValidationIssue,
} from "../../../../packages/core/src/index.ts";

interface D1RunResult {
  success?: boolean;
  meta?: {
    changes?: number;
    rows_written?: number;
  };
}

interface D1Prepared {
  bind: (...values: unknown[]) => {
    run: () => Promise<D1RunResult>;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results: T[] }>;
  };
  run: () => Promise<D1RunResult>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
}

export interface MobileEnv {
  HELIOSINGER_DB?: {
    prepare: (sql: string) => D1Prepared;
  };
  HELIOSINGER_KV?: {
    get: (key: string, type?: "text" | "json") => Promise<string | unknown | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
}

interface MemoryStore {
  devices: Map<
    string,
    {
      installId: string;
      pushToken: string;
      timezone: string;
      platform: "ios" | "android";
      appVersion: string | null;
      preferences: DevicePreferencesRequest;
      updatedAt: string;
    }
  >;
  snapshots: SpaceWeatherNowResponse[];
  flares: FlareTimelineItem[];
}

export interface ApiErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface PersistMeta {
  stored: {
    d1: boolean;
    kv: boolean;
    memory: boolean;
  };
  errors: string[];
}

export interface ApiSuccessMeta {
  source?: "live" | "cached";
  requestId?: string;
  storage?: PersistMeta;
}

export interface JsonBodyResult<T> {
  ok: boolean;
  value?: T;
  response?: Response;
}

export interface ValidationFailure {
  code: string;
  message: string;
  details?: ValidationIssue[];
}

declare global {
  // eslint-disable-next-line no-var
  var __HELIOSINGER_MOBILE_MEM__: MemoryStore | undefined;
}

function memoryStore(): MemoryStore {
  if (!globalThis.__HELIOSINGER_MOBILE_MEM__) {
    globalThis.__HELIOSINGER_MOBILE_MEM__ = {
      devices: new Map(),
      snapshots: [],
      flares: [],
    };
  }
  return globalThis.__HELIOSINGER_MOBILE_MEM__;
}

function parseNumber(input: unknown, fallback = 0): number {
  const value = Number.parseFloat(String(input ?? ""));
  return Number.isFinite(value) ? value : fallback;
}

function normalizeKpValue(raw: unknown): number {
  return Math.max(0, Math.min(9, parseNumber(raw, 0)));
}

function d1Changes(result: D1RunResult | null | undefined): number {
  if (!result) return 0;
  if (typeof result.meta?.changes === "number") return result.meta.changes;
  if (typeof result.meta?.rows_written === "number") return result.meta.rows_written;
  if (result.success) return 1;
  return 0;
}

function requestIdFromRequest(request?: Request): string | undefined {
  if (!request) return undefined;
  return request.headers.get("cf-ray") ?? request.headers.get("x-request-id") ?? undefined;
}

function normalizedTimezone(input: string): string {
  return isValidTimezone(input) ? input : "UTC";
}

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsOptionsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  options: {
    details?: unknown;
    requestId?: string;
  } = {}
): Response {
  const payload: ApiErrorPayload = {
    ok: false,
    error: {
      code,
      message,
      ...(options.details !== undefined ? { details: options.details } : {}),
    },
    ...(options.requestId ? { requestId: options.requestId } : {}),
  };
  return jsonResponse(payload, { status });
}

export async function parseJsonBody<T = unknown>(
  request: Request,
  requestId?: string
): Promise<JsonBodyResult<T>> {
  try {
    const parsed = (await request.json()) as T;
    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_json", "Request body must be valid JSON", {
        requestId,
      }),
    };
  }
}

export function validateRegistrationPayload(
  body: unknown
):
  | { ok: true; payload: DeviceRegistrationRequest }
  | { ok: false; failure: ValidationFailure } {
  const validated = validateDeviceRegistrationRequest(body);
  if (!validated.ok) {
    return {
      ok: false,
      failure: {
        code: "invalid_registration_payload",
        message: "Registration payload is invalid",
        details: validated.errors,
      },
    };
  }

  return {
    ok: true,
    payload: {
      ...validated.value,
      timezone: normalizedTimezone(validated.value.timezone),
      platform: normalizePlatform(validated.value.platform) ?? "ios",
    },
  };
}

export function validatePreferencesPayload(
  body: unknown
):
  | { ok: true; payload: DevicePreferencesRequest }
  | { ok: false; failure: ValidationFailure } {
  const validated = validateDevicePreferencesRequest(body, { installIdRequired: true });
  if (!validated.ok) {
    return {
      ok: false,
      failure: {
        code: "invalid_preferences_payload",
        message: "Preferences payload is invalid",
        details: validated.errors,
      },
    };
  }

  return {
    ok: true,
    payload: {
      ...validated.value,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function validateUnregisterPayload(
  body: unknown
): { ok: true; installId: string } | { ok: false; failure: ValidationFailure } {
  const result = validateDevicePreferencesRequest(body, { installIdRequired: true });
  if (!result.ok || !result.value.installId) {
    return {
      ok: false,
      failure: {
        code: "invalid_install_id",
        message: "installId is required",
        details: result.ok ? undefined : result.errors,
      },
    };
  }

  return { ok: true, installId: result.value.installId };
}

export function parseFlaresLimit(raw: unknown): number {
  return sanitizeFlaresLimit(raw, 50);
}

async function fetchJsonArray(url: string): Promise<unknown[] | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed : null;
}

export async function fetchLatestSpaceWeather(): Promise<SpaceWeatherNowResponse> {
  const [plasmaResult, magResult, kResult, xrayResult] = await Promise.allSettled([
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json"),
  ]);

  const plasma = plasmaResult.status === "fulfilled" ? plasmaResult.value : null;
  const mag = magResult.status === "fulfilled" ? magResult.value : null;
  const k = kResult.status === "fulfilled" ? kResult.value : null;
  const xray = xrayResult.status === "fulfilled" ? xrayResult.value : null;

  let solarWind: SpaceWeatherNowResponse["solarWind"] = null;
  if (Array.isArray(plasma) && plasma.length > 1) {
    const latest = plasma[plasma.length - 1] as unknown[];
    solarWind = {
      timestamp: new Date((latest?.[0] as string | number | Date) ?? Date.now()).toISOString(),
      density: parseNumber(latest?.[1]),
      velocity: parseNumber(latest?.[2]),
      temperature: parseNumber(latest?.[3]),
      bz: 0,
      bt: 0,
    };
  }

  if (solarWind && Array.isArray(mag) && mag.length > 1) {
    const latest = mag[mag.length - 1] as unknown[];
    const bx = parseNumber(latest?.[1]);
    const by = parseNumber(latest?.[2]);
    const bz = parseNumber(latest?.[3]);
    solarWind.bz = bz;
    solarWind.bt = parseNumber(latest?.[4], Math.sqrt(bx * bx + by * by + bz * bz));
  }

  let geomagnetic: SpaceWeatherNowResponse["geomagnetic"] = null;
  if (Array.isArray(k) && k.length > 1) {
    const latest = k[k.length - 1] as unknown[];
    geomagnetic = {
      kp: normalizeKpValue(latest?.[1]),
      aRunning: parseNumber(latest?.[2]),
    };
  }

  let flare: SpaceWeatherNowResponse["flare"] = null;
  if (Array.isArray(xray) && xray.length > 0) {
    const latest = xray[xray.length - 1] as Record<string, unknown>;
    const timestamp = new Date(
      (latest?.time_tag ?? latest?.timestamp ?? Date.now()) as string | number
    ).toISOString();
    const shortWave = parseNumber(latest?.xrsa ?? latest?.short_wave ?? latest?.["0.05-0.4nm"]);
    const longWave = parseNumber(latest?.xrsb ?? latest?.long_wave ?? latest?.["0.1-0.8nm"]);
    const flareClass = String(latest?.flare_class ?? classifyFlareClass(longWave || shortWave));
    const rScale = deriveRScale(longWave || shortWave);

    flare = {
      timestamp,
      shortWave,
      longWave,
      flareClass,
      rScale,
      impactSummary: summarizeFlareImpact(flareClass, rScale),
    };
  }

  if (!solarWind && !geomagnetic && !flare) {
    throw new Error("No live upstream datasets are currently available");
  }

  const referenceTimestamp = solarWind?.timestamp ?? flare?.timestamp ?? new Date().toISOString();
  const staleness = computeStaleness(referenceTimestamp);
  const condition = deriveSpaceWeatherCondition({
    kp: geomagnetic?.kp,
    velocity: solarWind?.velocity,
    bz: solarWind?.bz,
  });

  const payload: SpaceWeatherNowResponse = {
    timestamp: new Date().toISOString(),
    stale: staleness.stale,
    staleSeconds: staleness.staleSeconds,
    source: "live",
    condition,
    solarWind,
    geomagnetic,
    flare,
    impacts: [],
    lastUpdatedAt: referenceTimestamp,
  };

  payload.impacts = buildImpactBullets(payload);
  return payload;
}

export async function fetchFlareTimeline(limit = 50): Promise<FlareTimelineItem[]> {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json");
    if (!response.ok) {
      return [];
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .slice(Math.max(0, raw.length - Math.max(1, limit)))
      .map((entry) => {
        const timestamp = new Date(
          (entry?.time_tag ?? entry?.timestamp ?? Date.now()) as string | number
        ).toISOString();
        const shortWave = parseNumber(entry?.xrsa ?? entry?.short_wave ?? entry?.["0.05-0.4nm"]);
        const longWave = parseNumber(entry?.xrsb ?? entry?.long_wave ?? entry?.["0.1-0.8nm"]);
        const flareClass = String(entry?.flare_class ?? classifyFlareClass(longWave || shortWave));

        return toFlareTimelineItem({
          timestamp,
          shortWave,
          longWave,
          flareClass,
          source: "goes",
        });
      })
      .reverse();
  } catch {
    return [];
  }
}

export function getLearningContext(now: SpaceWeatherNowResponse): LearningCard[] {
  return buildLearningCards(now);
}

export function getDefaultPreferences(installId: string): DevicePreferencesRequest {
  return {
    installId,
    alertsEnabled: true,
    thresholds: {
      kp: 5,
      bzSouth: 8,
      flareClasses: ["M", "X"],
    },
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 7,
    },
    backgroundAudioEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

export function snapshotWithCurrentStaleness(
  snapshot: SpaceWeatherNowResponse,
  source: "live" | "cached" = "cached"
): SpaceWeatherNowResponse {
  const staleness = computeStaleness(snapshot.lastUpdatedAt);
  return {
    ...snapshot,
    source,
    stale: true,
    staleSeconds: staleness.staleSeconds,
    timestamp: new Date().toISOString(),
  };
}

export async function persistSnapshot(
  env: MobileEnv | undefined,
  payload: SpaceWeatherNowResponse
): Promise<PersistMeta> {
  const meta: PersistMeta = {
    stored: { d1: false, kv: false, memory: false },
    errors: [],
  };

  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      await db
        .prepare(
          `
        INSERT INTO space_weather_snapshots (
          snapshot_at,
          source,
          condition,
          stale,
          stale_seconds,
          velocity,
          density,
          bz,
          temperature,
          kp,
          flare_class,
          flare_short_wave,
          flare_long_wave,
          flare_r_scale,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          payload.lastUpdatedAt,
          payload.source,
          payload.condition,
          payload.stale ? 1 : 0,
          payload.staleSeconds,
          payload.solarWind?.velocity ?? null,
          payload.solarWind?.density ?? null,
          payload.solarWind?.bz ?? null,
          payload.solarWind?.temperature ?? null,
          payload.geomagnetic?.kp ?? null,
          payload.flare?.flareClass ?? null,
          payload.flare?.shortWave ?? null,
          payload.flare?.longWave ?? null,
          payload.flare?.rScale ?? null,
          JSON.stringify(payload)
        )
        .run();
      meta.stored.d1 = true;
    } catch (error) {
      meta.errors.push(`d1_snapshot_write_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  if (!meta.stored.d1) {
    const mem = memoryStore();
    mem.snapshots.unshift(payload);
    mem.snapshots = mem.snapshots.slice(0, 200);
    meta.stored.memory = true;
  }

  try {
    await env?.HELIOSINGER_KV?.put("mobile:latest-space-weather", JSON.stringify(payload), {
      expirationTtl: 60 * 60,
    });
    if (env?.HELIOSINGER_KV) {
      meta.stored.kv = true;
    }
  } catch (error) {
    meta.errors.push(`kv_snapshot_write_failed:${error instanceof Error ? error.message : "unknown"}`);
  }

  return meta;
}

export async function cachedSnapshot(env: MobileEnv | undefined): Promise<SpaceWeatherNowResponse | null> {
  try {
    const fromKv = await env?.HELIOSINGER_KV?.get("mobile:latest-space-weather", "text");
    if (typeof fromKv === "string") {
      try {
        return JSON.parse(fromKv) as SpaceWeatherNowResponse;
      } catch {
        // ignore parse errors
      }
    }
  } catch {
    // ignore kv read issues
  }

  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const row = await db
        .prepare("SELECT payload_json FROM space_weather_snapshots ORDER BY id DESC LIMIT 1")
        .first<{ payload_json: string }>();

      if (row?.payload_json) {
        try {
          return JSON.parse(row.payload_json) as SpaceWeatherNowResponse;
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // ignore d1 read issues
    }
  }

  return memoryStore().snapshots[0] ?? null;
}

export async function persistFlares(
  env: MobileEnv | undefined,
  items: FlareTimelineItem[]
): Promise<PersistMeta> {
  const meta: PersistMeta = {
    stored: { d1: false, kv: false, memory: false },
    errors: [],
  };

  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      for (const flare of items) {
        await db
          .prepare(
            `
          INSERT OR IGNORE INTO flare_events (
            event_id,
            event_at,
            flare_class,
            short_wave,
            long_wave,
            r_scale,
            impact_summary,
            source,
            payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            flare.id,
            flare.timestamp,
            flare.flareClass,
            flare.shortWave,
            flare.longWave,
            flare.rScale,
            flare.impactSummary,
            flare.source,
            JSON.stringify(flare)
          )
          .run();
      }
      meta.stored.d1 = true;
    } catch (error) {
      meta.errors.push(`d1_flares_write_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  if (!meta.stored.d1) {
    const mem = memoryStore();
    const merged = new Map<string, FlareTimelineItem>();
    for (const existing of mem.flares) {
      merged.set(existing.id, existing);
    }
    for (const incoming of items) {
      merged.set(incoming.id, incoming);
    }
    mem.flares = [...merged.values()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 300);
    meta.stored.memory = true;
  }

  try {
    await env?.HELIOSINGER_KV?.put("mobile:latest-flares", JSON.stringify(items.slice(0, 200)), {
      expirationTtl: 60 * 60,
    });
    if (env?.HELIOSINGER_KV) {
      meta.stored.kv = true;
    }
  } catch (error) {
    meta.errors.push(`kv_flares_write_failed:${error instanceof Error ? error.message : "unknown"}`);
  }

  return meta;
}

export async function cachedFlares(
  env: MobileEnv | undefined,
  limit: number
): Promise<FlareTimelineItem[]> {
  try {
    const fromKv = await env?.HELIOSINGER_KV?.get("mobile:latest-flares", "text");
    if (typeof fromKv === "string") {
      try {
        const parsed = JSON.parse(fromKv) as FlareTimelineItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, limit);
        }
      } catch {
        // ignore parse errors
      }
    }
  } catch {
    // ignore kv read errors
  }

  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const rows = await db
        .prepare(
          "SELECT event_id, event_at, flare_class, short_wave, long_wave, r_scale, impact_summary, source FROM flare_events ORDER BY event_at DESC LIMIT ?"
        )
        .bind(limit)
        .all<{
          event_id: string;
          event_at: string;
          flare_class: string;
          short_wave: number;
          long_wave: number;
          r_scale: string;
          impact_summary: string;
          source: string;
        }>();

      return rows.results.map((row) => ({
        id: row.event_id,
        timestamp: row.event_at,
        flareClass: row.flare_class,
        shortWave: row.short_wave,
        longWave: row.long_wave,
        rScale: row.r_scale,
        impactSummary: row.impact_summary,
        source: row.source === "goes" ? "goes" : "derived",
      }));
    } catch {
      // ignore d1 read errors
    }
  }

  return memoryStore().flares.slice(0, limit);
}

export async function registerDevice(
  env: MobileEnv | undefined,
  payload: DeviceRegistrationRequest
): Promise<void> {
  const now = new Date().toISOString();
  const preferences = payload.preferences ?? getDefaultPreferences(payload.installId);
  const timezone = normalizedTimezone(payload.timezone);
  const platform = normalizePlatform(payload.platform) ?? "ios";

  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      await db
        .prepare(
          `
        INSERT INTO device_subscriptions (
          install_id,
          push_token,
          timezone,
          platform,
          app_version,
          alerts_enabled,
          kp_threshold,
          bz_south_threshold,
          flare_classes,
          quiet_hours_enabled,
          quiet_start_hour,
          quiet_end_hour,
          background_audio_enabled,
          preferences_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(install_id) DO UPDATE SET
          push_token = excluded.push_token,
          timezone = excluded.timezone,
          platform = excluded.platform,
          app_version = excluded.app_version,
          alerts_enabled = excluded.alerts_enabled,
          kp_threshold = excluded.kp_threshold,
          bz_south_threshold = excluded.bz_south_threshold,
          flare_classes = excluded.flare_classes,
          quiet_hours_enabled = excluded.quiet_hours_enabled,
          quiet_start_hour = excluded.quiet_start_hour,
          quiet_end_hour = excluded.quiet_end_hour,
          background_audio_enabled = excluded.background_audio_enabled,
          preferences_json = excluded.preferences_json,
          updated_at = excluded.updated_at
      `
        )
        .bind(
          payload.installId,
          payload.pushToken,
          timezone,
          platform,
          payload.appVersion ?? null,
          preferences.alertsEnabled ? 1 : 0,
          preferences.thresholds.kp,
          preferences.thresholds.bzSouth,
          JSON.stringify(preferences.thresholds.flareClasses),
          preferences.quietHours.enabled ? 1 : 0,
          preferences.quietHours.startHour,
          preferences.quietHours.endHour,
          preferences.backgroundAudioEnabled ? 1 : 0,
          JSON.stringify(preferences),
          now,
          now
        )
        .run();
      return;
    } catch {
      // fall through to memory fallback
    }
  }

  memoryStore().devices.set(payload.installId, {
    installId: payload.installId,
    pushToken: payload.pushToken,
    timezone,
    platform,
    appVersion: payload.appVersion ?? null,
    preferences,
    updatedAt: now,
  });
}

export async function updateDevicePreferences(
  env: MobileEnv | undefined,
  payload: DevicePreferencesRequest
): Promise<boolean> {
  const db = env?.HELIOSINGER_DB;
  const now = payload.updatedAt ?? new Date().toISOString();

  if (db) {
    try {
      const result = await db
        .prepare(
          `
        UPDATE device_subscriptions
        SET
          alerts_enabled = ?,
          kp_threshold = ?,
          bz_south_threshold = ?,
          flare_classes = ?,
          quiet_hours_enabled = ?,
          quiet_start_hour = ?,
          quiet_end_hour = ?,
          background_audio_enabled = ?,
          preferences_json = ?,
          updated_at = ?
        WHERE install_id = ?
      `
        )
        .bind(
          payload.alertsEnabled ? 1 : 0,
          payload.thresholds.kp,
          payload.thresholds.bzSouth,
          JSON.stringify(payload.thresholds.flareClasses),
          payload.quietHours.enabled ? 1 : 0,
          payload.quietHours.startHour,
          payload.quietHours.endHour,
          payload.backgroundAudioEnabled ? 1 : 0,
          JSON.stringify(payload),
          now,
          payload.installId
        )
        .run();

      return d1Changes(result) > 0;
    } catch {
      // fall through to memory fallback
    }
  }

  const existing = memoryStore().devices.get(payload.installId);
  if (!existing) return false;
  memoryStore().devices.set(payload.installId, {
    ...existing,
    preferences: { ...payload, updatedAt: now },
    updatedAt: now,
  });
  return true;
}

export async function unregisterDevice(
  env: MobileEnv | undefined,
  installId: string
): Promise<boolean> {
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const result = await db
        .prepare("DELETE FROM device_subscriptions WHERE install_id = ?")
        .bind(installId)
        .run();
      return d1Changes(result) > 0;
    } catch {
      // fall through to memory fallback
    }
  }

  return memoryStore().devices.delete(installId);
}

export function getRequestId(request?: Request): string | undefined {
  return requestIdFromRequest(request);
}
