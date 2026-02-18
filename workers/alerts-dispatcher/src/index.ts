import {
  buildImpactBullets,
  classifyFlareClass,
  computeStaleness,
  deriveRScale,
  deriveSpaceWeatherCondition,
  evaluateAlertEvents,
  isValidTimezone,
  summarizeFlareImpact,
  validateDevicePreferencesRequest,
  type DevicePreferencesRequest,
  type SpaceWeatherNowResponse,
} from "../../../packages/core/src/index.ts";

interface D1Prepared {
  bind: (...values: unknown[]) => {
    run: () => Promise<{ success?: boolean; meta?: { changes?: number } }>;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results: T[] }>;
  };
  run: () => Promise<{ success?: boolean; meta?: { changes?: number } }>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
}

interface D1Database {
  prepare: (sql: string) => D1Prepared;
}

interface KVNamespace {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
}

interface Env {
  HELIOSINGER_DB: D1Database;
  HELIOSINGER_KV: KVNamespace;
  EXPO_PUSH_ACCESS_TOKEN?: string;
}

interface DeviceRow {
  install_id: string;
  push_token: string;
  timezone: string;
  preferences_json: string;
  last_notification_at: string | null;
  alerts_enabled: number;
  kp_threshold: number;
  bz_south_threshold: number;
  flare_classes: string;
  quiet_hours_enabled: number;
  quiet_start_hour: number;
  quiet_end_hour: number;
  background_audio_enabled: number;
}

const DEDUPE_TTL_SECONDS = 15 * 60;

function parseNumber(input: unknown, fallback = 0): number {
  const parsed = Number.parseFloat(String(input ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeKpValue(raw: unknown): number {
  return Math.max(0, Math.min(9, parseNumber(raw, 0)));
}

async function fetchJsonArray(url: string): Promise<unknown[] | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeCachedSnapshot(snapshot: SpaceWeatherNowResponse): SpaceWeatherNowResponse {
  const staleness = computeStaleness(snapshot.lastUpdatedAt);
  return {
    ...snapshot,
    source: "cached",
    stale: true,
    staleSeconds: staleness.staleSeconds,
    timestamp: new Date().toISOString(),
  };
}

async function fetchNow(previous: SpaceWeatherNowResponse | null): Promise<SpaceWeatherNowResponse> {
  const [plasma, mag, kp, xray] = await Promise.all([
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json"),
  ]);

  const hasAnyLive = Boolean(
    (Array.isArray(plasma) && plasma.length > 1) ||
      (Array.isArray(mag) && mag.length > 1) ||
      (Array.isArray(kp) && kp.length > 1) ||
      (Array.isArray(xray) && xray.length > 0)
  );

  if (!hasAnyLive) {
    if (previous) {
      return normalizeCachedSnapshot(previous);
    }
    throw new Error("No live NOAA datasets available and no cached snapshot exists");
  }

  const plasmaRow = Array.isArray(plasma) && plasma.length > 1 ? (plasma[plasma.length - 1] as unknown[]) : null;
  const magRow = Array.isArray(mag) && mag.length > 1 ? (mag[mag.length - 1] as unknown[]) : null;
  const kpRow = Array.isArray(kp) && kp.length > 1 ? (kp[kp.length - 1] as unknown[]) : null;
  const flareRow = Array.isArray(xray) && xray.length > 0 ? (xray[xray.length - 1] as Record<string, unknown>) : null;

  const velocity = plasmaRow ? parseNumber(plasmaRow[2], previous?.solarWind?.velocity ?? 0) : (previous?.solarWind?.velocity ?? 0);
  const density = plasmaRow ? parseNumber(plasmaRow[1], previous?.solarWind?.density ?? 0) : (previous?.solarWind?.density ?? 0);
  const temperature = plasmaRow ? parseNumber(plasmaRow[3], previous?.solarWind?.temperature ?? 0) : (previous?.solarWind?.temperature ?? 0);

  const bx = magRow ? parseNumber(magRow[1], 0) : 0;
  const by = magRow ? parseNumber(magRow[2], 0) : 0;
  const bz = magRow
    ? parseNumber(magRow[3], previous?.solarWind?.bz ?? 0)
    : (previous?.solarWind?.bz ?? 0);
  const bt = magRow
    ? parseNumber(magRow[4], Math.sqrt(bx * bx + by * by + bz * bz))
    : (previous?.solarWind?.bt ?? Math.sqrt(bx * bx + by * by + bz * bz));

  const kpValue = kpRow ? normalizeKpValue(kpRow[1]) : (previous?.geomagnetic?.kp ?? 0);
  const aRunning = kpRow ? parseNumber(kpRow[2], previous?.geomagnetic?.aRunning ?? 0) : (previous?.geomagnetic?.aRunning ?? 0);

  const shortWave = flareRow
    ? parseNumber(flareRow.xrsa ?? flareRow.short_wave ?? flareRow["0.05-0.4nm"], previous?.flare?.shortWave ?? 0)
    : (previous?.flare?.shortWave ?? 0);
  const longWave = flareRow
    ? parseNumber(flareRow.xrsb ?? flareRow.long_wave ?? flareRow["0.1-0.8nm"], previous?.flare?.longWave ?? 0)
    : (previous?.flare?.longWave ?? 0);

  const flareClass = flareRow
    ? String(flareRow.flare_class ?? classifyFlareClass(longWave || shortWave))
    : (previous?.flare?.flareClass ?? classifyFlareClass(longWave || shortWave));
  const rScale = deriveRScale(longWave || shortWave);

  const sourceTs = new Date(
    (plasmaRow?.[0] as string | number | Date) ?? previous?.lastUpdatedAt ?? Date.now()
  ).toISOString();

  const flareTimestamp = new Date(
    (flareRow?.time_tag ?? flareRow?.timestamp ?? previous?.flare?.timestamp ?? Date.now()) as string | number
  ).toISOString();

  const condition = deriveSpaceWeatherCondition({ kp: kpValue, velocity, bz });
  const staleness = computeStaleness(sourceTs);

  const snapshot: SpaceWeatherNowResponse = {
    timestamp: new Date().toISOString(),
    stale: staleness.stale,
    staleSeconds: staleness.staleSeconds,
    source: "live",
    condition,
    solarWind: {
      timestamp: sourceTs,
      velocity,
      density,
      bz,
      temperature,
      bt,
    },
    geomagnetic: {
      kp: kpValue,
      aRunning,
    },
    flare: {
      flareClass,
      shortWave,
      longWave,
      rScale,
      impactSummary: summarizeFlareImpact(flareClass, rScale),
      timestamp: flareTimestamp,
    },
    impacts: [],
    lastUpdatedAt: sourceTs,
  };

  snapshot.impacts = buildImpactBullets(snapshot);
  return snapshot;
}

async function loadPreviousSnapshot(env: Env): Promise<SpaceWeatherNowResponse | null> {
  try {
    const raw = await env.HELIOSINGER_KV.get("mobile:latest-space-weather", "text");
    if (!raw) return null;
    return JSON.parse(raw) as SpaceWeatherNowResponse;
  } catch {
    return null;
  }
}

async function saveSnapshot(env: Env, snapshot: SpaceWeatherNowResponse): Promise<void> {
  await env.HELIOSINGER_KV.put("mobile:latest-space-weather", JSON.stringify(snapshot), {
    expirationTtl: 60 * 60,
  });

  await env.HELIOSINGER_DB.prepare(
    `INSERT INTO space_weather_snapshots (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      snapshot.lastUpdatedAt,
      snapshot.source,
      snapshot.condition,
      snapshot.stale ? 1 : 0,
      snapshot.staleSeconds,
      snapshot.solarWind?.velocity ?? null,
      snapshot.solarWind?.density ?? null,
      snapshot.solarWind?.bz ?? null,
      snapshot.solarWind?.temperature ?? null,
      snapshot.geomagnetic?.kp ?? null,
      snapshot.flare?.flareClass ?? null,
      snapshot.flare?.shortWave ?? null,
      snapshot.flare?.longWave ?? null,
      snapshot.flare?.rScale ?? null,
      JSON.stringify(snapshot)
    )
    .run();

  if (snapshot.flare) {
    const eventId = `${snapshot.flare.timestamp}-${snapshot.flare.flareClass}-${Math.round(
      snapshot.flare.longWave * 1e12
    )}`;

    await env.HELIOSINGER_DB.prepare(
      `INSERT OR IGNORE INTO flare_events (
        event_id,
        event_at,
        flare_class,
        short_wave,
        long_wave,
        r_scale,
        impact_summary,
        source,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        snapshot.flare.timestamp,
        snapshot.flare.flareClass,
        snapshot.flare.shortWave,
        snapshot.flare.longWave,
        snapshot.flare.rScale,
        snapshot.flare.impactSummary,
        snapshot.source === "live" ? "derived" : "goes",
        JSON.stringify(snapshot.flare)
      )
      .run();
  }
}

function parseDevicePreferences(row: DeviceRow): DevicePreferencesRequest | null {
  try {
    const parsed = JSON.parse(row.preferences_json) as unknown;
    const validated = validateDevicePreferencesRequest(parsed, { installIdRequired: false });
    if (validated.ok) {
      return {
        ...validated.value,
        installId: row.install_id,
      };
    }
  } catch {
    // Continue to column fallback.
  }

  let flareClasses: string[] = ["M", "X"];
  try {
    const parsed = JSON.parse(row.flare_classes) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      flareClasses = parsed.map((value) => String(value));
    }
  } catch {
    // keep defaults
  }

  return {
    installId: row.install_id,
    alertsEnabled: row.alerts_enabled === 1,
    thresholds: {
      kp: Number.isFinite(row.kp_threshold) ? row.kp_threshold : 5,
      bzSouth: Number.isFinite(row.bz_south_threshold) ? row.bz_south_threshold : 8,
      flareClasses,
    },
    quietHours: {
      enabled: row.quiet_hours_enabled === 1,
      startHour: Number.isFinite(row.quiet_start_hour) ? row.quiet_start_hour : 22,
      endHour: Number.isFinite(row.quiet_end_hour) ? row.quiet_end_hour : 7,
    },
    backgroundAudioEnabled: row.background_audio_enabled === 1,
  };
}

async function loadDevices(env: Env): Promise<DeviceRow[]> {
  const rows = await env.HELIOSINGER_DB.prepare(
    `SELECT
      install_id,
      push_token,
      timezone,
      preferences_json,
      last_notification_at,
      alerts_enabled,
      kp_threshold,
      bz_south_threshold,
      flare_classes,
      quiet_hours_enabled,
      quiet_start_hour,
      quiet_end_hour,
      background_audio_enabled
    FROM device_subscriptions
    WHERE push_token IS NOT NULL AND push_token != ''`
  ).all<DeviceRow>();

  return rows.results;
}

async function logNotification(
  env: Env,
  installId: string,
  eventId: string,
  status: "sent" | "skipped" | "failed",
  reason: string
): Promise<void> {
  await env.HELIOSINGER_DB.prepare(
    `INSERT OR IGNORE INTO notification_log (
      install_id,
      event_id,
      status,
      reason,
      created_at
    ) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(installId, eventId, status, reason, new Date().toISOString())
    .run();

  if (status === "sent") {
    await env.HELIOSINGER_DB.prepare(
      "UPDATE device_subscriptions SET last_notification_at = ? WHERE install_id = ?"
    )
      .bind(new Date().toISOString(), installId)
      .run();
  }
}

function extractExpoError(payload: unknown): string | null {
  const rows = Array.isArray((payload as { data?: unknown })?.data)
    ? ((payload as { data: Array<Record<string, unknown>> }).data ?? [])
    : [((payload as { data?: Record<string, unknown> })?.data ?? payload) as Record<string, unknown>];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const status = String(row.status ?? "").toLowerCase();
    if (status && status !== "ok") {
      const message = String(row.message ?? row.details ?? "unknown Expo push error");
      return `${status}:${message}`;
    }
  }

  return null;
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  accessToken?: string
): Promise<void> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      priority: "high",
      channelId: "heliosinger-alerts",
    }),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // leave as null
  }

  if (!response.ok) {
    throw new Error(`Expo push failed (${response.status}): ${text}`);
  }

  const ticketError = extractExpoError(parsed);
  if (ticketError) {
    throw new Error(`Expo push rejected ticket: ${ticketError}`);
  }
}

function dedupeKey(installId: string, key: string): string {
  return `mobile:notify-dedupe:${installId}:${key}`;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const previous = await loadPreviousSnapshot(env);
    const current = await fetchNow(previous);

    await saveSnapshot(env, current);

    const devices = await loadDevices(env);
    for (const device of devices) {
      const preferences = parseDevicePreferences(device);
      if (!preferences || !preferences.alertsEnabled) {
        continue;
      }

      const timezone = isValidTimezone(device.timezone) ? device.timezone : "UTC";
      const events = evaluateAlertEvents({
        previous,
        current,
        preferences,
        timezone,
        now: new Date(),
        lastNotificationAt: device.last_notification_at ? new Date(device.last_notification_at) : null,
      });

      if (events.length === 0) {
        continue;
      }

      const event = events[0];
      const key = dedupeKey(device.install_id, event.dedupeKey);
      const recentlySent = await env.HELIOSINGER_KV.get(key, "text");
      if (recentlySent) {
        console.info("alerts-dispatcher:skipped", {
          installId: device.install_id,
          eventId: event.id,
          reason: "dedupe_cooldown",
          dedupeKey: event.dedupeKey,
        });
        await logNotification(env, device.install_id, event.id, "skipped", "dedupe_cooldown");
        continue;
      }

      try {
        await sendExpoPush(device.push_token, event.title, event.body, env.EXPO_PUSH_ACCESS_TOKEN);
        await env.HELIOSINGER_KV.put(key, new Date().toISOString(), {
          expirationTtl: DEDUPE_TTL_SECONDS,
        });
        await logNotification(env, device.install_id, event.id, "sent", "dispatched");
      } catch (error) {
        await logNotification(
          env,
          device.install_id,
          event.id,
          "failed",
          error instanceof Error ? error.message : "unknown"
        );
      }
    }
  },
};
