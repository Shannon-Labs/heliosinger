import {
  classifyFlareClass,
  deriveRScale,
  deriveSpaceWeatherCondition,
  evaluateAlertEvents,
  summarizeFlareImpact,
  type DevicePreferencesRequest,
  type SpaceWeatherNowResponse,
} from "../../../packages/core/src/index";

interface D1Prepared {
  bind: (...values: unknown[]) => {
    run: () => Promise<{ success?: boolean }>;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results: T[] }>;
  };
  run: () => Promise<{ success?: boolean }>;
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
}

async function fetchNow(): Promise<SpaceWeatherNowResponse> {
  const [plasma, mag, kp, xray] = await Promise.all([
    fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json").then((r) => r.json()),
    fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json").then((r) => r.json()),
  ]);

  const plasmaRow = Array.isArray(plasma) && plasma.length > 1 ? plasma[plasma.length - 1] : null;
  const magRow = Array.isArray(mag) && mag.length > 1 ? mag[mag.length - 1] : null;
  const kpRow = Array.isArray(kp) && kp.length > 1 ? kp[kp.length - 1] : null;
  const flareRow = Array.isArray(xray) && xray.length > 0 ? xray[xray.length - 1] : null;

  const velocity = Number.parseFloat(plasmaRow?.[2] ?? "0") || 0;
  const density = Number.parseFloat(plasmaRow?.[1] ?? "0") || 0;
  const temperature = Number.parseFloat(plasmaRow?.[3] ?? "0") || 0;
  const bz = Number.parseFloat(magRow?.[3] ?? "0") || 0;
  const kpValue = Number.parseFloat(kpRow?.[1] ?? "0") || 0;

  const shortWave = Number.parseFloat(flareRow?.xrsa ?? flareRow?.short_wave ?? flareRow?.["0.05-0.4nm"] ?? "0") || 0;
  const longWave = Number.parseFloat(flareRow?.xrsb ?? flareRow?.long_wave ?? flareRow?.["0.1-0.8nm"] ?? "0") || 0;
  const flareClass = String(flareRow?.flare_class ?? classifyFlareClass(longWave || shortWave));
  const rScale = deriveRScale(longWave || shortWave);

  const condition = deriveSpaceWeatherCondition({ kp: kpValue, velocity, bz });
  const sourceTs = new Date(plasmaRow?.[0] ?? Date.now()).toISOString();

  return {
    timestamp: new Date().toISOString(),
    stale: false,
    staleSeconds: 0,
    source: "live",
    condition,
    solarWind: {
      timestamp: sourceTs,
      velocity,
      density,
      bz,
      temperature,
      bt: Number.parseFloat(magRow?.[4] ?? "0") || 0,
    },
    geomagnetic: {
      kp: kpValue,
      aRunning: Number.parseFloat(kpRow?.[2] ?? "0") || 0,
    },
    flare: {
      flareClass,
      shortWave,
      longWave,
      rScale,
      impactSummary: summarizeFlareImpact(flareClass, rScale),
      timestamp: new Date(flareRow?.time_tag ?? flareRow?.timestamp ?? Date.now()).toISOString(),
    },
    impacts: [],
    lastUpdatedAt: sourceTs,
  };
}

async function loadPreviousSnapshot(env: Env): Promise<SpaceWeatherNowResponse | null> {
  const raw = await env.HELIOSINGER_KV.get("mobile:latest-space-weather", "text");
  if (!raw) return null;
  try {
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
    const eventId = `${snapshot.flare.timestamp}-${snapshot.flare.flareClass}-${Math.round(snapshot.flare.longWave * 1e12)}`;
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
        "derived",
        JSON.stringify(snapshot.flare)
      )
      .run();
  }
}

async function loadDevices(env: Env): Promise<DeviceRow[]> {
  const rows = await env.HELIOSINGER_DB.prepare(
    "SELECT install_id, push_token, timezone, preferences_json, last_notification_at FROM device_subscriptions WHERE push_token IS NOT NULL"
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
    `INSERT INTO notification_log (
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed (${response.status}): ${text}`);
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const previous = await loadPreviousSnapshot(env);
    const current = await fetchNow();

    await saveSnapshot(env, current);

    const devices = await loadDevices(env);
    for (const device of devices) {
      let preferences: DevicePreferencesRequest;
      try {
        preferences = JSON.parse(device.preferences_json) as DevicePreferencesRequest;
      } catch {
        continue;
      }

      const events = evaluateAlertEvents({
        previous,
        current,
        preferences,
        timezone: device.timezone || "UTC",
        now: new Date(),
        lastNotificationAt: device.last_notification_at ? new Date(device.last_notification_at) : null,
      });

      if (events.length === 0) {
        continue;
      }

      const event = events[0];
      try {
        await sendExpoPush(device.push_token, event.title, event.body, env.EXPO_PUSH_ACCESS_TOKEN);
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
