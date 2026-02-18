import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeConditions,
  createNarratorState,
  getCurrentInsight,
  updateNarrator,
  type ComprehensiveSpaceWeatherData,
  type HeliosingerData,
} from "../src/index";

function withFixedNow<T>(fn: () => T): T {
  const original = Date.now;
  Date.now = () => new Date("2026-02-18T12:34:56.000Z").getTime();
  try {
    return fn();
  } finally {
    Date.now = original;
  }
}

function data(overrides: Partial<ComprehensiveSpaceWeatherData> = {}): ComprehensiveSpaceWeatherData {
  return {
    timestamp: "2026-02-18T12:34:56.000Z",
    solar_wind: {
      timestamp: "2026-02-18T12:34:00.000Z",
      velocity: 640,
      density: 18,
      bz: -9,
      bx: 2,
      by: -3,
      bt: 11,
      temperature: 140000,
    },
    k_index: {
      timestamp: "2026-02-18T12:30:00.000Z",
      kp: 5.8,
      a_running: 46,
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
      h_component: -80,
      d_component: 10,
      z_component: 7,
    },
    ...overrides,
  };
}

function heliosinger(overrides: Partial<HeliosingerData> = {}): HeliosingerData {
  return {
    baseNote: "G4",
    frequency: 391.99,
    midiNote: 67,
    decayTime: 1,
    detuneCents: -12,
    condition: "storm",
    density: 18,
    velocity: 640,
    bz: -9,
    kIndex: 5.8,
    currentVowel: {
      name: "I",
      displayName: "I",
      ipaSymbol: "/i/",
      description: "Close front",
      formants: [270, 2290, 3010, 3400],
      bandwidths: [60, 100, 120, 150],
      openness: 0,
      brightness: 1,
      frontness: 1,
    },
    vowelName: "I",
    vowelDescription: "Close front",
    solarMood: "Surging",
    chordQuality: {
      name: "Minor Triad",
      symbol: "Gm",
      description: "Minor Triad",
      intervals: ["Root", "Minor 3rd", "Perfect 5th"],
      construction: "tertian",
      condition: "storm",
      physicsMapping: "",
      aestheticMapping: "",
    },
    formantFilters: [
      { frequency: 270, bandwidth: 60, gain: 4 },
      { frequency: 2290, bandwidth: 100, gain: 3.5 },
    ],
    chordVoicing: [
      { frequency: 391.99, midiNote: 67, noteName: "G4", amplitude: 1 },
      { frequency: 466.16, midiNote: 70, noteName: "A#4", amplitude: 0.4 },
      { frequency: 587.33, midiNote: 74, noteName: "D5", amplitude: 0.35 },
    ],
    stereoSpread: 0.8,
    leftGain: 0.4,
    rightGain: 0.4,
    harmonicCount: 7,
    harmonicAmplitudes: [1, 0.5, 0.33],
    vibratoDepth: 30,
    vibratoRate: 4,
    tremoloRate: 5,
    tremoloDepth: 0.6,
    filterFrequency: 1700,
    filterQ: 5,
    shimmerGain: 0.2,
    rumbleGain: 0.2,
    reverbRoomSize: 0.6,
    delayTime: 0.35,
    delayFeedback: 0.2,
    delayGain: 0.25,
    binauralBeatHz: 5,
    binauralBaseHz: 175,
    binauralMix: 0.12,
    ...overrides,
  };
}

test("analyzeConditions ranks higher-priority insights first", () => {
  withFixedNow(() => {
    const state = createNarratorState();
    const insights = analyzeConditions(data(), data({ k_index: { timestamp: "2026-02-18T12:00:00.000Z", kp: 3, a_running: 10 } }), heliosinger(), state);
    assert.ok(insights.length > 0);
    assert.equal(insights[0]?.priority, "breakthrough");
    assert.ok(insights.some((i) => i.id === "sw-storm"));
    assert.ok(insights.some((i) => i.id === "em-aurora"));
  });
});

test("updateNarrator enforces queue cap and cooldown history", () => {
  withFixedNow(() => {
    const initial = createNarratorState();
    const next = updateNarrator(data(), data({ k_index: { timestamp: "2026-02-18T12:00:00.000Z", kp: 2, a_running: 8 } }), heliosinger(), initial);

    assert.ok(next.queue.length <= 3);
    assert.ok(next.currentInsight);
    assert.ok(next.insightHistory.length > 0);

    const repeated = analyzeConditions(data(), data({ k_index: { timestamp: "2026-02-18T12:00:00.000Z", kp: 2, a_running: 8 } }), heliosinger(), next);
    assert.ok(repeated.every((insight) => !next.insightHistory.includes(insight.id)));
  });
});

test("narrator handles empty or missing data safely", () => {
  const state = createNarratorState();
  const noInsights = analyzeConditions(undefined, undefined, null, state);
  assert.deepEqual(noInsights, []);

  const updated = updateNarrator(undefined, undefined, null, state);
  assert.equal(getCurrentInsight(updated), null);
  assert.equal(updated.queue.length, 0);
});
