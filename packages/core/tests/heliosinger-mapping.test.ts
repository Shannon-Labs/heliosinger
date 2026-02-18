import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultHeliosingerMapping,
  mapSpaceWeatherToHeliosinger,
  type ComprehensiveSpaceWeatherData,
} from "../src/index";

function withDeterministicEnv<T>(fn: () => T): T {
  const originalDateNow = Date.now;
  const originalRandom = Math.random;
  Date.now = () => new Date("2026-02-18T12:34:56.000Z").getTime();
  Math.random = () => 0.5;
  try {
    return fn();
  } finally {
    Date.now = originalDateNow;
    Math.random = originalRandom;
  }
}

function sample(overrides: Partial<ComprehensiveSpaceWeatherData> = {}): ComprehensiveSpaceWeatherData {
  return {
    timestamp: "2026-02-18T12:34:56.000Z",
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 640,
      density: 18,
      bz: -9.2,
      bx: 2.5,
      by: -3.1,
      bt: 10.1,
      temperature: 140000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 5.7,
      a_running: 45,
    },
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: 3e-5,
      long_wave: 2.2e-5,
      flare_class: "M2.2",
    },
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: 120,
      flux_50mev: 12,
      flux_100mev: 1,
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: 450000,
      flux_0_8mev: 1200000,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:33:00.000Z",
      h_component: -85,
      d_component: 12,
      z_component: 8,
    },
    ...overrides,
  };
}

test("mapSpaceWeatherToHeliosinger maps deterministic fixture without regressions", () => {
  withDeterministicEnv(() => {
    const mapped = mapSpaceWeatherToHeliosinger(sample());

    assert.equal(mapped.baseNote, "G4");
    assert.equal(mapped.condition, "storm");
    assert.equal(mapped.vowelName, "E");
    assert.equal(mapped.chordQuality.name, "Major 6th Chord");
    assert.equal(mapped.chordVoicing.length, 4);
    assert.equal(mapped.chordVoicing[0]?.noteName, "G4");
    assert.equal(mapped.harmonicCount, 7);
    assert.equal(mapped.tremoloRate, 5.25);
    assert.equal(mapped.delayTime, 0.35);
    assert.ok(mapped.frequency > 390 && mapped.frequency < 393);
    assert.ok(mapped.filterFrequency > 1717 && mapped.filterFrequency < 1718);
    assert.ok(mapped.binauralBeatHz > 5 && mapped.binauralBeatHz < 6);
    assert.ok(mapped.binauralMix > 0.1 && mapped.binauralMix < 0.13);
  });
});

test("mapSpaceWeatherToHeliosinger shows expected stateful behavior on second call", () => {
  withDeterministicEnv(() => {
    const first = mapSpaceWeatherToHeliosinger(
      sample({
        solar_wind: {
          timestamp: "2026-02-18T12:33:00.000Z",
          velocity: 500,
          density: 8,
          bz: -3,
          bx: 1,
          by: -1,
          bt: 5,
          temperature: 90000,
        },
        k_index: {
          timestamp: "2026-02-18T12:30:00.000Z",
          kp: 3.2,
          a_running: 20,
        },
        xray_flux: {
          timestamp: "2026-02-18T12:33:00.000Z",
          short_wave: 1e-6,
          long_wave: 1e-6,
          flare_class: "C1.0",
        },
        proton_flux: {
          timestamp: "2026-02-18T12:33:00.000Z",
          flux_10mev: 8,
          flux_50mev: 0.5,
          flux_100mev: 0.1,
        },
      })
    );

    const second = mapSpaceWeatherToHeliosinger(
      sample({
        solar_wind: {
          timestamp: "2026-02-18T12:35:00.000Z",
          velocity: 650,
          density: 16,
          bz: -11,
          bx: 2,
          by: -2,
          bt: 12,
          temperature: 140000,
        },
        k_index: {
          timestamp: "2026-02-18T12:35:00.000Z",
          kp: 6.8,
          a_running: 48,
        },
        xray_flux: {
          timestamp: "2026-02-18T12:35:00.000Z",
          short_wave: 5e-5,
          long_wave: 3e-5,
          flare_class: "M5.0",
        },
        proton_flux: {
          timestamp: "2026-02-18T12:35:00.000Z",
          flux_10mev: 220,
          flux_50mev: 20,
          flux_100mev: 3,
        },
      })
    );

    assert.equal(first.condition, "moderate");
    assert.equal(second.condition, "storm");
    assert.ok(second.filterFrequency > first.filterFrequency);
    assert.ok(second.tremoloDepth > first.tremoloDepth);
    assert.ok(second.rumbleGain > first.rumbleGain);
    assert.ok(second.delayFeedback < first.delayFeedback);
  });
});

test("createDefaultHeliosingerMapping provides safe baseline", () => {
  const fallback = createDefaultHeliosingerMapping();
  assert.equal(fallback.condition, "quiet");
  assert.equal(fallback.baseNote, "C2");
  assert.equal(fallback.vowelName, "A");
  assert.equal(fallback.chordVoicing.length, 1);
});

test("mapSpaceWeatherToHeliosinger throws when solar_wind is missing", () => {
  assert.throws(
    () =>
      mapSpaceWeatherToHeliosinger(
        sample({
          solar_wind: null,
        })
      ),
    /Solar wind data is required/
  );
});
