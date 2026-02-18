import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import worker from "../src/index";
import type { SpaceWeatherNowResponse } from "../../../packages/core/src/index";

type DeviceRow = {
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
};

class FakeKV {
  private map = new Map<string, string>();
  readonly puts: Array<{ key: string; value: string }> = [];
  preserveLatestSnapshot = false;

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.puts.push({ key, value });
    if (this.preserveLatestSnapshot && key === "mobile:latest-space-weather") {
      return;
    }
    this.map.set(key, value);
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

class FakeDB {
  readonly snapshots: unknown[] = [];
  readonly flareEvents = new Set<string>();
  readonly notificationLog: Array<{ install_id: string; event_id: string; status: string; reason: string }> = [];

  constructor(public devices: DeviceRow[]) {}

  prepare(sql: string) {
    const db = this;
    const text = sql.replace(/\s+/g, " ").trim();

    const execute = async (values: unknown[]) => {
      if (text.startsWith("INSERT INTO space_weather_snapshots")) {
        db.snapshots.push(values);
        return { success: true, meta: { changes: 1 } };
      }

      if (text.startsWith("INSERT OR IGNORE INTO flare_events")) {
        const eventId = String(values[0]);
        if (!db.flareEvents.has(eventId)) {
          db.flareEvents.add(eventId);
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      }

      if (text.startsWith("INSERT OR IGNORE INTO notification_log")) {
        const installId = String(values[0]);
        const eventId = String(values[1]);
        const status = String(values[2]);
        const reason = String(values[3] ?? "");
        const exists = db.notificationLog.some(
          (row) => row.install_id === installId && row.event_id === eventId
        );
        if (!exists) {
          db.notificationLog.push({ install_id: installId, event_id: eventId, status, reason });
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      }

      if (text.startsWith("UPDATE device_subscriptions SET last_notification_at")) {
        const updatedAt = String(values[0]);
        const installId = String(values[1]);
        const row = db.devices.find((item) => item.install_id === installId);
        if (!row) {
          return { success: true, meta: { changes: 0 } };
        }
        row.last_notification_at = updatedAt;
        return { success: true, meta: { changes: 1 } };
      }

      return { success: true, meta: { changes: 0 } };
    };

    const queryAll = async () => {
      if (text.includes("FROM device_subscriptions")) {
        return { results: [...db.devices] };
      }
      return { results: [] };
    };

    return {
      bind: (...values: unknown[]) => ({
        run: () => execute(values),
        first: async <T>() => null as T | null,
        all: async <T>() => (await queryAll()) as { results: T[] },
      }),
      run: () => execute([]),
      first: async <T>() => null as T | null,
      all: async <T>() => (await queryAll()) as { results: T[] },
    };
  }
}

const originalFetch = globalThis.fetch;
const originalDate = Date;

function fixedDate(iso: string): void {
  const fixed = new originalDate(iso);
  // @ts-expect-error test override
  global.Date = class extends originalDate {
    constructor(value?: string | number | Date) {
      if (value) {
        super(value);
      } else {
        super(fixed);
      }
    }

    static now(): number {
      return fixed.getTime();
    }
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  global.Date = originalDate;
});

function snapshot(overrides: Partial<SpaceWeatherNowResponse> = {}): SpaceWeatherNowResponse {
  return {
    timestamp: "2026-02-18T12:30:00.000Z",
    stale: false,
    staleSeconds: 0,
    source: "live",
    condition: "quiet",
    solarWind: {
      timestamp: "2026-02-18T12:30:00.000Z",
      velocity: 400,
      density: 5,
      bz: -2,
      bt: 6,
      temperature: 90000,
    },
    geomagnetic: { kp: 2, aRunning: 10 },
    flare: {
      timestamp: "2026-02-18T12:30:00.000Z",
      flareClass: "C1.0",
      shortWave: 1e-6,
      longWave: 1e-6,
      rScale: "R1",
      impactSummary: "Minor flare activity with occasional short-lived radio absorption effects.",
    },
    impacts: [],
    lastUpdatedAt: "2026-02-18T12:30:00.000Z",
    ...overrides,
  };
}

function makeDevice(overrides: Partial<DeviceRow> = {}): DeviceRow {
  const prefs = {
    installId: "device-1",
    alertsEnabled: true,
    thresholds: { kp: 5, bzSouth: 8, flareClasses: ["M", "X"] },
    quietHours: { enabled: false, startHour: 22, endHour: 7 },
    backgroundAudioEnabled: true,
  };

  return {
    install_id: "device-1",
    push_token: "ExponentPushToken[test]",
    timezone: "UTC",
    preferences_json: JSON.stringify(prefs),
    last_notification_at: null,
    alerts_enabled: 1,
    kp_threshold: 5,
    bz_south_threshold: 8,
    flare_classes: JSON.stringify(["M", "X"]),
    quiet_hours_enabled: 0,
    quiet_start_hour: 22,
    quiet_end_hour: 7,
    background_audio_enabled: 1,
    ...overrides,
  };
}

function installFetchMocks(options: { expoTicketStatus?: "ok" | "error"; kp?: number; bz?: number; flareClass?: string }): { pushCalls: string[] } {
  const pushCalls: string[] = [];
  const kp = options.kp ?? 6;
  const bz = options.bz ?? -9;
  const flareClass = options.flareClass ?? "M2.0";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);

    if (url.includes("plasma-2-hour.json")) {
      return new Response(
        JSON.stringify([
          ["time_tag", "density", "speed", "temperature"],
          ["2026-02-18 12:35:00", "12", "620", "120000"],
        ]),
        { status: 200 }
      );
    }

    if (url.includes("mag-2-hour.json")) {
      return new Response(
        JSON.stringify([
          ["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "bt"],
          ["2026-02-18 12:35:00", "2", "-3", String(bz), "11"],
        ]),
        { status: 200 }
      );
    }

    if (url.includes("noaa-planetary-k-index.json")) {
      return new Response(
        JSON.stringify([
          ["time_tag", "kp", "a_running"],
          ["2026-02-18 12:35:00", String(kp), "30"],
        ]),
        { status: 200 }
      );
    }

    if (url.includes("goes-xrs-report.json")) {
      return new Response(
        JSON.stringify([
          {
            time_tag: "2026-02-18T12:35:00Z",
            xrsa: 2e-5,
            xrsb: 2e-5,
            flare_class: flareClass,
          },
        ]),
        { status: 200 }
      );
    }

    if (url.includes("exp.host/--/api/v2/push/send")) {
      pushCalls.push(String(init?.body ?? ""));
      if (options.expoTicketStatus === "error") {
        return new Response(
          JSON.stringify({ data: { status: "error", message: "DeviceNotRegistered" } }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ data: { status: "ok" } }), { status: 200 });
    }

    return new Response("not-found", { status: 404 });
  }) as typeof fetch;

  return { pushCalls };
}

async function runScheduled(env: { HELIOSINGER_DB: FakeDB; HELIOSINGER_KV: FakeKV; EXPO_PUSH_ACCESS_TOKEN?: string }) {
  await worker.scheduled({} as ScheduledController, env as unknown as Parameters<typeof worker.scheduled>[1]);
}

test("dispatches alert on threshold crossing", async () => {
  fixedDate("2026-02-18T12:36:00.000Z");
  const kv = new FakeKV();
  kv.set("mobile:latest-space-weather", JSON.stringify(snapshot()));

  const db = new FakeDB([makeDevice()]);
  const env = { HELIOSINGER_DB: db, HELIOSINGER_KV: kv, EXPO_PUSH_ACCESS_TOKEN: "token" };
  const { pushCalls } = installFetchMocks({ expoTicketStatus: "ok" });

  await runScheduled(env);

  assert.equal(pushCalls.length, 1);
  assert.ok(db.notificationLog.some((row) => row.status === "sent"));
});

test("dedupe cooldown skips repeated notifications", async () => {
  fixedDate("2026-02-18T12:36:00.000Z");
  const kv = new FakeKV();
  kv.preserveLatestSnapshot = true;
  kv.set("mobile:latest-space-weather", JSON.stringify(snapshot()));

  const db = new FakeDB([makeDevice()]);
  const env = { HELIOSINGER_DB: db, HELIOSINGER_KV: kv, EXPO_PUSH_ACCESS_TOKEN: "token" };
  const { pushCalls } = installFetchMocks({ expoTicketStatus: "ok" });

  await runScheduled(env);
  await runScheduled(env);

  assert.equal(pushCalls.length, 1);
  assert.ok(db.notificationLog.some((row) => row.status === "sent"));
  const dedupeWrites = kv.puts.filter((entry) =>
    entry.key.startsWith("mobile:notify-dedupe:device-1:")
  );
  assert.equal(dedupeWrites.length, 1);
});

test("quiet hours suppresses alert dispatch", async () => {
  fixedDate("2026-02-18T23:30:00.000Z");
  const kv = new FakeKV();
  kv.set("mobile:latest-space-weather", JSON.stringify(snapshot()));

  const device = makeDevice({
    preferences_json: JSON.stringify({
      installId: "device-1",
      alertsEnabled: true,
      thresholds: { kp: 5, bzSouth: 8, flareClasses: ["M", "X"] },
      quietHours: { enabled: true, startHour: 22, endHour: 7 },
      backgroundAudioEnabled: true,
    }),
    quiet_hours_enabled: 1,
  });

  const db = new FakeDB([device]);
  const env = { HELIOSINGER_DB: db, HELIOSINGER_KV: kv, EXPO_PUSH_ACCESS_TOKEN: "token" };
  const { pushCalls } = installFetchMocks({ expoTicketStatus: "ok" });

  await runScheduled(env);

  assert.equal(pushCalls.length, 0);
  assert.equal(db.notificationLog.length, 0);
});

test("invalid timezone falls back to UTC and still processes alerts", async () => {
  fixedDate("2026-02-18T12:36:00.000Z");
  const kv = new FakeKV();
  kv.set("mobile:latest-space-weather", JSON.stringify(snapshot()));

  const db = new FakeDB([
    makeDevice({
      timezone: "Invalid/Timezone",
    }),
  ]);

  const env = { HELIOSINGER_DB: db, HELIOSINGER_KV: kv, EXPO_PUSH_ACCESS_TOKEN: "token" };
  const { pushCalls } = installFetchMocks({ expoTicketStatus: "ok" });

  await runScheduled(env);

  assert.equal(pushCalls.length, 1);
  assert.ok(db.notificationLog.some((row) => row.status === "sent"));
});

test("Expo logical ticket error is logged as failed", async () => {
  fixedDate("2026-02-18T12:36:00.000Z");
  const kv = new FakeKV();
  kv.set("mobile:latest-space-weather", JSON.stringify(snapshot()));

  const db = new FakeDB([makeDevice()]);
  const env = { HELIOSINGER_DB: db, HELIOSINGER_KV: kv, EXPO_PUSH_ACCESS_TOKEN: "token" };
  const { pushCalls } = installFetchMocks({ expoTicketStatus: "error" });

  await runScheduled(env);

  assert.equal(pushCalls.length, 1);
  const failed = db.notificationLog.find((row) => row.status === "failed");
  assert.ok(failed);
  assert.match(failed?.reason ?? "", /Expo push rejected ticket/i);
});
