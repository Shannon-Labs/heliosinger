import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAlertEvents,
  isWithinQuietHours,
  type DevicePreferencesRequest,
  type SpaceWeatherNowResponse,
} from "../src/index";

const basePrefs: DevicePreferencesRequest = {
  installId: "device-1",
  alertsEnabled: true,
  thresholds: {
    kp: 5,
    bzSouth: 8,
    flareClasses: ["M", "X"],
  },
  quietHours: {
    enabled: true,
    startHour: 22,
    endHour: 7,
  },
  backgroundAudioEnabled: true,
};

function buildNow(overrides: Partial<SpaceWeatherNowResponse>): SpaceWeatherNowResponse {
  return {
    timestamp: "2026-02-18T00:00:00.000Z",
    stale: false,
    staleSeconds: 0,
    source: "live",
    condition: "quiet",
    solarWind: {
      timestamp: "2026-02-18T00:00:00.000Z",
      velocity: 400,
      density: 5,
      bz: 1,
      temperature: 100000,
    },
    geomagnetic: { kp: 2 },
    flare: {
      flareClass: "B",
      shortWave: 1e-7,
      longWave: 1e-7,
      rScale: "R0",
      impactSummary: "none",
      timestamp: "2026-02-18T00:00:00.000Z",
    },
    impacts: [],
    lastUpdatedAt: "2026-02-18T00:00:00.000Z",
    ...overrides,
  };
}

test("quiet hours handles midnight spanning windows", () => {
  const q = { enabled: true, startHour: 22, endHour: 7 };
  assert.equal(isWithinQuietHours(new Date("2026-02-18T23:30:00Z"), q, "UTC"), true);
  assert.equal(isWithinQuietHours(new Date("2026-02-18T03:30:00Z"), q, "UTC"), true);
  assert.equal(isWithinQuietHours(new Date("2026-02-18T12:30:00Z"), q, "UTC"), false);
});

test("evaluateAlertEvents emits threshold crossing alerts", () => {
  const prev = buildNow({
    geomagnetic: { kp: 3 },
    solarWind: { ...buildNow({}).solarWind!, bz: -2 },
    flare: { ...buildNow({}).flare!, flareClass: "C" },
  });

  const curr = buildNow({
    geomagnetic: { kp: 6 },
    solarWind: { ...buildNow({}).solarWind!, bz: -9 },
    flare: { ...buildNow({}).flare!, flareClass: "M" },
  });

  const alerts = evaluateAlertEvents({
    previous: prev,
    current: curr,
    preferences: {
      ...basePrefs,
      quietHours: { ...basePrefs.quietHours, enabled: false },
    },
    now: new Date("2026-02-18T12:00:00Z"),
  });

  const types = alerts.map((a) => a.type).sort();
  assert.deepEqual(types, ["bz-threshold", "flare-class", "kp-threshold"]);
});
