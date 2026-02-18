import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningCards, type SpaceWeatherNowResponse } from "../src/index";

const sample: SpaceWeatherNowResponse = {
  timestamp: "2026-02-18T00:00:00.000Z",
  stale: false,
  staleSeconds: 0,
  source: "live",
  condition: "storm",
  solarWind: {
    timestamp: "2026-02-18T00:00:00.000Z",
    velocity: 620,
    density: 14,
    bz: -10,
    temperature: 120000,
  },
  geomagnetic: { kp: 6 },
  flare: {
    flareClass: "M",
    shortWave: 2e-5,
    longWave: 2e-5,
    rScale: "R2",
    impactSummary: "Strong flare activity",
    timestamp: "2026-02-18T00:00:00.000Z",
  },
  impacts: [],
  lastUpdatedAt: "2026-02-18T00:00:00.000Z",
};

test("buildLearningCards is deterministic for same input", () => {
  const first = buildLearningCards(sample);
  const second = buildLearningCards(sample);

  assert.deepEqual(first, second);
  assert.ok(first.length >= 3);
  assert.ok(first.some((c) => c.id === "learn-high-speed-stream"));
});
