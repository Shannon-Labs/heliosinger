import assert from "node:assert/strict";
import test from "node:test";

import {
  TEST_CONDITION_INPUTS,
  buildMappedChord,
  buildMappedChordFromStorageConfig,
  getTestConditionInput,
} from "../_shared/chord-mapping";

test("buildMappedChord is deterministic for identical inputs", () => {
  const input = { velocity: 500, density: 8, bz: -7 };

  const first = buildMappedChord(input);
  const second = buildMappedChord(input);

  assert.deepEqual(second, first);
  assert.equal(first.frequency, Math.round(first.frequency * 100) / 100);
  assert.equal(first.decayTime, Math.round(first.decayTime * 100) / 100);
});

test("buildMappedChordFromStorageConfig applies snake_case config values", () => {
  const mapped = buildMappedChordFromStorageConfig(
    { velocity: 650, density: 9, bz: -4 },
    {
      velocity_min: 200,
      velocity_max: 800,
      midi_note_min: 60,
      midi_note_max: 60,
      density_min: 0.5,
      density_max: 50,
      decay_time_min: 0.5,
      decay_time_max: 0.5,
      bz_detune_cents: -12,
      bz_threshold: -5,
    }
  );

  assert.equal(mapped.midiNote, 60);
  assert.equal(mapped.noteName, "C4");
  assert.equal(mapped.decayTime, 0.5);
});

test("getTestConditionInput reuses shared deterministic fixtures", () => {
  assert.deepEqual(getTestConditionInput("quiet"), TEST_CONDITION_INPUTS.quiet);
  assert.deepEqual(getTestConditionInput("moderate"), TEST_CONDITION_INPUTS.moderate);
  assert.deepEqual(getTestConditionInput("storm"), TEST_CONDITION_INPUTS.storm);
  assert.equal(getTestConditionInput("unknown"), null);
});
