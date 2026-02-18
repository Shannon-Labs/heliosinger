import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { onRequestPost as registerDevice } from "../devices/register";
import { onRequestPut as updatePreferences } from "../devices/preferences";
import { onRequestDelete as unregisterDevice } from "../devices/unregister";
import { onRequestGet as getNow } from "../space-weather/now";
import { onRequestGet as getFlares } from "../flares";
import { onRequestGet as getLearning } from "../learn/context";
import { persistFlares, persistSnapshot, type MobileEnv } from "../_lib";
import type { FlareTimelineItem, SpaceWeatherNowResponse } from "../../../../../../packages/core/src/index";

const originalFetch = globalThis.fetch;

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(url: string, method: string): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: "{not-valid-json",
  });
}

function sampleSnapshot(source: "live" | "cached" = "cached"): SpaceWeatherNowResponse {
  return {
    timestamp: "2026-02-18T12:35:00.000Z",
    stale: source === "cached",
    staleSeconds: source === "cached" ? 30 : 0,
    source,
    condition: "storm",
    solarWind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 620,
      density: 12,
      bz: -8,
      bt: 10,
      temperature: 120000,
    },
    geomagnetic: {
      kp: 5.4,
      aRunning: 30,
    },
    flare: {
      timestamp: "2026-02-18T12:34:30.000Z",
      flareClass: "M2.0",
      shortWave: 2e-5,
      longWave: 2e-5,
      rScale: "R2",
      impactSummary: "Strong flare activity may cause moderate radio blackouts and satellite communication degradation.",
    },
    impacts: ["Geomagnetic storm threshold reached (Kp 5+)."],
    lastUpdatedAt: "2026-02-18T12:34:00.000Z",
  };
}

function sampleFlares(): FlareTimelineItem[] {
  return [
    {
      id: "flare-1",
      timestamp: "2026-02-18T12:34:30.000Z",
      flareClass: "M2.0",
      shortWave: 2e-5,
      longWave: 2e-5,
      rScale: "R2",
      impactSummary:
        "Strong flare activity may cause moderate radio blackouts and satellite communication degradation.",
      source: "derived",
    },
  ];
}

function kvEnv(options: {
  snapshot?: SpaceWeatherNowResponse;
  flares?: FlareTimelineItem[];
}): MobileEnv {
  return {
    HELIOSINGER_KV: {
      async get(key: string): Promise<string | null> {
        if (key === "mobile:latest-space-weather" && options.snapshot) {
          return JSON.stringify(options.snapshot);
        }
        if (key === "mobile:latest-flares" && options.flares) {
          return JSON.stringify(options.flares);
        }
        return null;
      },
      async put(): Promise<void> {
        // no-op
      },
    },
  };
}

function d1Env(options: {
  snapshot?: SpaceWeatherNowResponse;
  flares?: FlareTimelineItem[];
}): MobileEnv {
  return {
    HELIOSINGER_DB: {
      prepare(sql: string) {
        const compact = sql.replace(/\s+/g, " ").trim();

        const first = async <T = unknown>(): Promise<T | null> => {
          if (compact.includes("FROM space_weather_snapshots") && options.snapshot) {
            return { payload_json: JSON.stringify(options.snapshot) } as T;
          }
          return null;
        };

        const all = async <T = unknown>(): Promise<{ results: T[] }> => {
          if (compact.includes("FROM flare_events") && options.flares) {
            const mapped = options.flares.map((flare) => ({
              event_id: flare.id,
              event_at: flare.timestamp,
              flare_class: flare.flareClass,
              short_wave: flare.shortWave,
              long_wave: flare.longWave,
              r_scale: flare.rScale,
              impact_summary: flare.impactSummary,
              source: flare.source,
            })) as T[];
            return { results: mapped };
          }
          return { results: [] };
        };

        return {
          bind: () => ({
            run: async () => ({ success: true, meta: { changes: 1 } }),
            first,
            all,
          }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
          first,
          all,
        };
      },
    },
  };
}

beforeEach(() => {
  delete (globalThis as { __HELIOSINGER_MOBILE_MEM__?: unknown }).__HELIOSINGER_MOBILE_MEM__;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("register validates required payload fields", async () => {
  const env: MobileEnv = {};
  const response = await registerDevice({
    request: jsonRequest("https://example.com/api/mobile/v1/devices/register", "POST", {}),
    env,
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { ok: boolean; error: { code: string } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "invalid_registration_payload");
});

test("register rejects malformed JSON", async () => {
  const env: MobileEnv = {};
  const response = await registerDevice({
    request: invalidJsonRequest("https://example.com/api/mobile/v1/devices/register", "POST"),
    env,
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { ok: boolean; error: { code: string } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "invalid_json");
});

test("preferences update returns 404 for unknown installId", async () => {
  const env: MobileEnv = {};
  const response = await updatePreferences({
    request: jsonRequest("https://example.com/api/mobile/v1/devices/preferences", "PUT", {
      installId: "missing-install",
      alertsEnabled: true,
      thresholds: { kp: 5, bzSouth: 8, flareClasses: ["M", "X"] },
      quietHours: { enabled: false, startHour: 22, endHour: 7 },
      backgroundAudioEnabled: true,
    }),
    env,
  });

  assert.equal(response.status, 404);
  const payload = (await response.json()) as { ok: boolean; error: { code: string } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "device_not_found");
});

test("preferences rejects malformed JSON", async () => {
  const env: MobileEnv = {};
  const response = await updatePreferences({
    request: invalidJsonRequest("https://example.com/api/mobile/v1/devices/preferences", "PUT"),
    env,
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { ok: boolean; error: { code: string } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "invalid_json");
});

test("unregister returns 404 for unknown installId", async () => {
  const env: MobileEnv = {};
  const response = await unregisterDevice({
    request: jsonRequest("https://example.com/api/mobile/v1/devices/unregister", "DELETE", {
      installId: "missing-install",
    }),
    env,
  });

  assert.equal(response.status, 404);
  const payload = (await response.json()) as { ok: boolean; error: { code: string } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "device_not_found");
});

test("now endpoint falls back to cached snapshot when live fetch fails", async () => {
  await persistSnapshot(undefined, sampleSnapshot("cached"));
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env: MobileEnv = {};
  const response = await getNow({
    request: new Request("https://example.com/api/mobile/v1/space-weather/now"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as SpaceWeatherNowResponse & { meta?: { source?: string } };
  assert.equal(payload.source, "cached");
  assert.equal(payload.stale, true);
  assert.equal(payload.meta?.source, "cached");
});

test("now endpoint fallback prefers KV over D1", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env: MobileEnv = {
    ...d1Env({
      snapshot: {
        ...sampleSnapshot("cached"),
        condition: "quiet",
      },
    }),
    ...kvEnv({
      snapshot: {
        ...sampleSnapshot("cached"),
        condition: "extreme",
      },
    }),
  };

  const response = await getNow({
    request: new Request("https://example.com/api/mobile/v1/space-weather/now"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as SpaceWeatherNowResponse;
  assert.equal(payload.source, "cached");
  assert.equal(payload.condition, "extreme");
});

test("now endpoint fallback uses D1 when KV is unavailable", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env = d1Env({
    snapshot: {
      ...sampleSnapshot("cached"),
      condition: "moderate",
    },
  });

  const response = await getNow({
    request: new Request("https://example.com/api/mobile/v1/space-weather/now"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as SpaceWeatherNowResponse;
  assert.equal(payload.source, "cached");
  assert.equal(payload.condition, "moderate");
});

test("flares endpoint falls back to cached timeline when live fetch fails", async () => {
  await persistFlares(undefined, sampleFlares());
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env: MobileEnv = {};
  const response = await getFlares({
    request: new Request("https://example.com/api/mobile/v1/flares?limit=5"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { items: FlareTimelineItem[]; source: string; meta?: { source?: string } };
  assert.equal(payload.source, "cached");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.meta?.source, "cached");
});

test("flares endpoint fallback uses D1 when KV is unavailable", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env = d1Env({
    flares: sampleFlares(),
  });

  const response = await getFlares({
    request: new Request("https://example.com/api/mobile/v1/flares?limit=5"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { items: FlareTimelineItem[]; source: string };
  assert.equal(payload.source, "cached");
  assert.equal(payload.items.length, 1);
});

test("learning endpoint falls back to cached snapshot when live fetch fails", async () => {
  await persistSnapshot(undefined, sampleSnapshot("cached"));
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const env: MobileEnv = {};
  const response = await getLearning({
    request: new Request("https://example.com/api/mobile/v1/learn/context"),
    env,
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { source: string; cards: unknown[]; meta?: { source?: string } };
  assert.equal(payload.source, "cached");
  assert.ok(payload.cards.length > 0);
  assert.equal(payload.meta?.source, "cached");
});
