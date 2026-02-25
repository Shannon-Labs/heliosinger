import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultHeliosingerMapping,
  createMappingContext,
  type HeliosingerData,
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
    reconnection: null,
    ...overrides,
  };
}

function assertAllFiniteNumbers(value: unknown): void {
  const visit = (item: unknown) => {
    if (typeof item === "number") {
      assert.ok(Number.isFinite(item), `expected finite number, got ${item}`);
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) {
        visit(child);
      }
      return;
    }
    if (item && typeof item === "object") {
      for (const child of Object.values(item)) {
        visit(child);
      }
    }
  };

  visit(value);
}

function mapWithNow(
  data: ComprehensiveSpaceWeatherData,
  context = createMappingContext(),
  now = Date.parse("2026-02-18T12:34:56.000Z")
): HeliosingerData {
  return mapSpaceWeatherToHeliosinger(data, context, { now });
}

test("mapSpaceWeatherToHeliosinger maps deterministic fixture without regressions", () => {
  withDeterministicEnv(() => {
    const context = createMappingContext();
    const mapped = mapSpaceWeatherToHeliosinger(
      sample(),
      context,
      { now: new Date("2026-02-18T12:34:56.000Z").getTime() }
    );

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
    assert.ok(mapped.filterFrequency > 1851 && mapped.filterFrequency < 1852);
    assert.ok(mapped.binauralBeatHz > 4.4 && mapped.binauralBeatHz < 4.8);
    assert.ok(mapped.binauralMix > 0.09 && mapped.binauralMix < 0.11);
  });
});

test("mapSpaceWeatherToHeliosinger shows expected stateful behavior on second call", () => {
  withDeterministicEnv(() => {
    const context = createMappingContext();
    const now = new Date("2026-02-18T12:34:56.000Z").getTime();
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
      }),
      context,
      { now }
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
      }),
      context,
      { now: now + 120000 }
    );

    assert.equal(first.condition, "moderate");
    assert.equal(second.condition, "extreme");
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
          }),
          createMappingContext(),
          { now: new Date("2026-02-18T12:34:56.000Z").getTime() }
        ),
      /Solar wind data is required/
    );
});

test("plasma beta correction materially brightens high-beta conditions", () => {
  const baseData = sample({
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 400,
      density: 1,
      bz: 0,
      bx: 5,
      by: 0,
      bt: 5,
      temperature: 100000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: 1e-8,
      long_wave: 1e-8,
      flare_class: "A",
    },
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: 1,
      flux_50mev: 0,
      flux_100mev: 0,
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: 1e3,
      flux_0_8mev: 2e3,
    },
  });

  const lowBeta = mapWithNow(baseData);
  const highBeta = mapWithNow(sample({
    ...baseData,
    solar_wind: {
      ...baseData.solar_wind!,
      density: 50,
    },
  }));

  assert.ok(highBeta.filterFrequency > lowBeta.filterFrequency + 40);
});

test("Mach number saturates high when Alfvén speed collapses", () => {
  const stableField = mapWithNow(sample({
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 100,
      density: 10,
      bz: 0,
      bx: 10,
      by: 0,
      bt: 10,
      temperature: 100000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
  }));

  const collapsedField = mapWithNow(sample({
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 100,
      density: 10,
      bz: 0,
      bx: 0,
      by: 0,
      bt: 0,
      temperature: 100000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
  }));

  assert.ok(collapsedField.harmonicCount > stableField.harmonicCount);
  assert.ok(collapsedField.vibratoRate > stableField.vibratoRate);
});

test("magnetometer edge values remain finite and slow pulse rate near H extremes", () => {
  const context = createMappingContext();
  const first = mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:00.000Z",
      h_component: 0,
      d_component: 0,
      z_component: 0,
    },
  }), context, Date.parse("2026-02-18T12:00:00.000Z"));

  const edge = mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:10.000Z",
      h_component: 200,
      d_component: 0,
      z_component: 0,
    },
  }), context, Date.parse("2026-02-18T12:00:10.000Z"));

  assert.ok(Number.isFinite(edge.tremoloRate));
  assert.ok(Number.isFinite(edge.tremoloDepth));
  assert.ok(edge.tremoloRate < first.tremoloRate);
});

test("dHdt mapping is cadence-invariant for equivalent slopes", () => {
  const contextA = createMappingContext();
  mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:00.000Z",
      h_component: 0,
      d_component: 0,
      z_component: 0,
    },
  }), contextA, Date.parse("2026-02-18T12:00:00.000Z"));
  const secondA = mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:06.000Z",
      h_component: 180,
      d_component: 0,
      z_component: 0,
    },
  }), contextA, Date.parse("2026-02-18T12:00:06.000Z"));

  const contextB = createMappingContext();
  mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:00.000Z",
      h_component: 0,
      d_component: 0,
      z_component: 0,
    },
  }), contextB, Date.parse("2026-02-18T12:00:00.000Z"));
  const secondB = mapWithNow(sample({
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:00:03.000Z",
      h_component: 90,
      d_component: 0,
      z_component: 0,
    },
  }), contextB, Date.parse("2026-02-18T12:00:03.000Z"));

  assert.ok(Math.abs(secondA.tremoloDepth - secondB.tremoloDepth) < 1e-6);
});

test("log scaling makes proton flux audibly responsive at moderate levels", () => {
  const base = {
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 420,
      density: 8,
      bz: 1,
      bx: 1,
      by: 0,
      bt: 4,
      temperature: 70000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 1,
      a_running: 5,
    },
  };

  const p1 = mapWithNow(sample({
    ...base,
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: 1,
      flux_50mev: 0.1,
      flux_100mev: 0.01,
    },
  }));
  const p100 = mapWithNow(sample({
    ...base,
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: 100,
      flux_50mev: 10,
      flux_100mev: 1,
    },
  }));

  assert.equal(p1.rumbleGain, 0);
  assert.ok(p100.rumbleGain >= 0.19);
  assert.ok(p100.reverbRoomSize > p1.reverbRoomSize);
});

test("xray and electron log scales are monotonic across orders of magnitude", () => {
  const base = {
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 500,
      density: 8,
      bz: -3,
      bx: 1,
      by: -1,
      bt: 6,
      temperature: 50000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 3.2,
      a_running: 20,
    },
  };

  const lowXray = mapWithNow(sample({
    ...base,
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: 1e-8,
      long_wave: 1e-8,
      flare_class: "A",
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: 1e3,
      flux_0_8mev: 2e3,
    },
  }));
  const highXray = mapWithNow(sample({
    ...base,
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: 1e-4,
      long_wave: 1e-4,
      flare_class: "X1.0",
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: 1e6,
      flux_0_8mev: 2e6,
    },
  }));

  assert.ok(highXray.filterFrequency > lowXray.filterFrequency + 15);
  assert.ok(highXray.shimmerGain > lowXray.shimmerGain);
});

test("super_extreme preserves or exceeds extreme intensity controls", () => {
  const common = {
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 620,
      density: 10,
      bz: -10,
      bx: 1,
      by: -2,
      bt: 8,
      temperature: 100000,
    },
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: 5e-5,
      long_wave: 3e-5,
      flare_class: "M5.0",
    },
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: 500,
      flux_50mev: 10,
      flux_100mev: 2,
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: 200000,
      flux_0_8mev: 500000,
    },
  };

  const extreme = mapWithNow(sample({
    ...common,
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 7.2,
      a_running: 55,
    },
  }));
  const superExtreme = mapWithNow(sample({
    ...common,
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 8.2,
      a_running: 70,
    },
  }));

  assert.equal(extreme.condition, "extreme");
  assert.equal(superExtreme.condition, "super_extreme");
  assert.ok(superExtreme.filterFrequency >= extreme.filterFrequency);
  assert.ok(superExtreme.delayGain > extreme.delayGain);
  assert.ok(superExtreme.delayTime > extreme.delayTime);
});

test("mapping remains finite under NaN and Infinity telemetry", () => {
  const mapped = mapWithNow(sample({
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 500,
      density: 8,
      bz: -5,
      bx: Number.NaN,
      by: Number.POSITIVE_INFINITY,
      bt: Number.NaN,
      temperature: 120000,
    },
    xray_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      short_wave: Number.NaN,
      long_wave: 1e-7,
      flare_class: "B",
    },
    proton_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_10mev: Number.POSITIVE_INFINITY,
      flux_50mev: 0,
      flux_100mev: 0,
    },
    electron_flux: {
      timestamp: "2026-02-18T12:33:00.000Z",
      flux_2mev: Number.NaN,
      flux_0_8mev: 0,
    },
    magnetometer: {
      timestamp: "2026-02-18T12:33:00.000Z",
      h_component: 200,
      d_component: 0,
      z_component: 0,
    },
  }));

  assertAllFiniteNumbers(mapped);
});
