import {
  buildImpactBullets,
  buildLearningCards,
  classifyFlareClass,
  computeStaleness,
  deriveRScale,
  deriveSpaceWeatherCondition,
  summarizeFlareImpact,
  toFlareTimelineItem,
  type DevicePreferencesRequest,
  type DeviceRegistrationRequest,
  type FlareTimelineItem,
  type LearningCard,
  type SpaceWeatherNowResponse,
} from "../../../../packages/core/src/index.ts";

export interface MobileEnv {
  HELIOSINGER_DB?: {
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        run: () => Promise<{ success?: boolean }>;
        first: <T = unknown>() => Promise<T | null>;
        all: <T = unknown>() => Promise<{ results: T[] }>;
      };
      run: () => Promise<{ success?: boolean }>;
      first: <T = unknown>() => Promise<T | null>;
      all: <T = unknown>() => Promise<{ results: T[] }>;
    };
  };
  HELIOSINGER_KV?: {
    get: (key: string, type?: "text" | "json") => Promise<string | unknown | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
}

interface MemoryStore {
  devices: Map<string, {
    installId: string;
    pushToken: string;
    timezone: string;
    platform: string;
    appVersion: string | null;
    preferences: DevicePreferencesRequest;
    updatedAt: string;
  }>;
  snapshots: SpaceWeatherNowResponse[];
  flares: FlareTimelineItem[];
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

function parseNumber(input: unknown, fallback = 0): number {
  const value = Number.parseFloat(String(input ?? ""));
  return Number.isFinite(value) ? value : fallback;
}

function normalizeKpValue(raw: unknown): number {
  const value = parseNumber(raw, 0);
  return Math.max(0, Math.min(9, value));
}

export async function fetchLatestSpaceWeather(): Promise<SpaceWeatherNowResponse> {
  const [plasmaResult, magResult, kResult, xrayResult] = await Promise.allSettled([
    fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json").then((r) => r.json()),
  ]);

  let solarWind: SpaceWeatherNowResponse["solarWind"] = null;
  if (plasmaResult.status === "fulfilled" && Array.isArray(plasmaResult.value) && plasmaResult.value.length > 1) {
    const rows = plasmaResult.value.slice(1);
    const latest = rows[rows.length - 1];
    solarWind = {
      timestamp: new Date(latest[0]).toISOString(),
      density: parseNumber(latest[1]),
      velocity: parseNumber(latest[2]),
      temperature: parseNumber(latest[3]),
      bz: 0,
      bt: 0,
    };
  }

  if (solarWind && magResult.status === "fulfilled" && Array.isArray(magResult.value) && magResult.value.length > 1) {
    const rows = magResult.value.slice(1);
    const latest = rows[rows.length - 1];
    solarWind.bz = parseNumber(latest[3]);
    solarWind.bt = parseNumber(latest[4], Math.sqrt(parseNumber(latest[1]) ** 2 + parseNumber(latest[2]) ** 2 + parseNumber(latest[3]) ** 2));
  }

  let geomagnetic: SpaceWeatherNowResponse["geomagnetic"] = null;
  if (kResult.status === "fulfilled" && Array.isArray(kResult.value) && kResult.value.length > 1) {
    const rows = kResult.value.slice(1);
    const latest = rows[rows.length - 1];
    geomagnetic = {
      kp: normalizeKpValue(latest[1]),
      aRunning: parseNumber(latest[2]),
    };
  }

  let flare: SpaceWeatherNowResponse["flare"] = null;
  if (xrayResult.status === "fulfilled" && Array.isArray(xrayResult.value) && xrayResult.value.length > 0) {
    const latest = xrayResult.value[xrayResult.value.length - 1];
    const timestamp = new Date((latest?.time_tag ?? latest?.timestamp ?? Date.now()) as string | number).toISOString();
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

  const referenceTimestamp = solarWind?.timestamp ?? flare?.timestamp ?? new Date().toISOString();
  const staleness = computeStaleness(referenceTimestamp);
  const condition = deriveSpaceWeatherCondition({
    kp: geomagnetic?.kp,
    velocity: solarWind?.velocity,
    bz: solarWind?.bz,
  });

  const nowPayload: SpaceWeatherNowResponse = {
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

  nowPayload.impacts = buildImpactBullets(nowPayload);
  return nowPayload;
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

    const items = raw
      .slice(Math.max(0, raw.length - Math.max(1, limit)))
      .map((entry) => {
        const timestamp = new Date((entry?.time_tag ?? entry?.timestamp ?? Date.now()) as string | number).toISOString();
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

    return items;
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

export async function persistSnapshot(
  env: MobileEnv | undefined,
  payload: SpaceWeatherNowResponse
): Promise<void> {
  const db = env?.HELIOSINGER_DB;
  if (db) {
    await db
      .prepare(`
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
      `)
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
  } else {
    const mem = memoryStore();
    mem.snapshots.unshift(payload);
    mem.snapshots = mem.snapshots.slice(0, 200);
  }

  await env?.HELIOSINGER_KV?.put("mobile:latest-space-weather", JSON.stringify(payload), {
    expirationTtl: 60 * 60,
  });
}

export async function cachedSnapshot(env: MobileEnv | undefined): Promise<SpaceWeatherNowResponse | null> {
  const fromKv = await env?.HELIOSINGER_KV?.get("mobile:latest-space-weather", "text");
  if (typeof fromKv === "string") {
    try {
      const parsed = JSON.parse(fromKv) as SpaceWeatherNowResponse;
      return parsed;
    } catch {
      // ignore parse errors
    }
  }

  const db = env?.HELIOSINGER_DB;
  if (db) {
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
  }

  const mem = memoryStore();
  return mem.snapshots[0] ?? null;
}

export async function cachedFlares(
  env: MobileEnv | undefined,
  limit: number
): Promise<FlareTimelineItem[]> {
  const db = env?.HELIOSINGER_DB;
  if (db) {
    const rows = await db
      .prepare("SELECT event_id, event_at, flare_class, short_wave, long_wave, r_scale, impact_summary, source FROM flare_events ORDER BY event_at DESC LIMIT ?")
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
  }

  const mem = memoryStore();
  return mem.flares.slice(0, limit);
}

export async function persistFlares(
  env: MobileEnv | undefined,
  items: FlareTimelineItem[]
): Promise<void> {
  const db = env?.HELIOSINGER_DB;

  if (db) {
    for (const flare of items) {
      await db
        .prepare(`
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
        `)
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
    return;
  }

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
}

export async function registerDevice(
  env: MobileEnv | undefined,
  payload: DeviceRegistrationRequest
): Promise<void> {
  const now = new Date().toISOString();
  const preferences = payload.preferences ?? getDefaultPreferences(payload.installId);

  const db = env?.HELIOSINGER_DB;
  if (db) {
    await db
      .prepare(`
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
      `)
      .bind(
        payload.installId,
        payload.pushToken,
        payload.timezone,
        payload.platform,
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
  }

  const mem = memoryStore();
  mem.devices.set(payload.installId, {
    installId: payload.installId,
    pushToken: payload.pushToken,
    timezone: payload.timezone,
    platform: payload.platform,
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
  const now = new Date().toISOString();

  if (db) {
    const result = await db
      .prepare(`
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
      `)
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

    return Boolean(result.success);
  }

  const mem = memoryStore();
  const existing = mem.devices.get(payload.installId);
  if (!existing) return false;
  mem.devices.set(payload.installId, {
    ...existing,
    preferences: payload,
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
    const result = await db
      .prepare("DELETE FROM device_subscriptions WHERE install_id = ?")
      .bind(installId)
      .run();
    return Boolean(result.success);
  }

  return memoryStore().devices.delete(installId);
}
