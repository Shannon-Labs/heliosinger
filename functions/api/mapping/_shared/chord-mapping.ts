import { mapSolarWindToChord } from "../../../../packages/core/src/heliosinger/midi";
import type { ChordData } from "../../../../packages/core/src/heliosinger/types";

export const DEFAULT_MAPPING_CONFIG = {
  velocity_min: 200,
  velocity_max: 800,
  midi_note_min: 36,
  midi_note_max: 84,
  density_min: 0.5,
  density_max: 50.0,
  decay_time_min: 0.2,
  decay_time_max: 5.0,
  bz_detune_cents: -20,
  bz_threshold: -5.0,
};

export interface ChordMappingInputConfig {
  velocityMin?: number;
  velocityMax?: number;
  midiNoteMin?: number;
  midiNoteMax?: number;
  densityMin?: number;
  densityMax?: number;
  decayTimeMin?: number;
  decayTimeMax?: number;
  bzDetuneCents?: number;
  bzThreshold?: number;
}

export interface ChordMappingStorageConfig {
  velocity_min?: number | null;
  velocity_max?: number | null;
  midi_note_min?: number | null;
  midi_note_max?: number | null;
  density_min?: number | null;
  density_max?: number | null;
  decay_time_min?: number | null;
  decay_time_max?: number | null;
  bz_detune_cents?: number | null;
  bz_threshold?: number | null;
}

export interface ChordMappingInput {
  velocity: number;
  density: number;
  bz: number;
}

export interface ChordMappingOutput extends ChordData {
  noteName: string;
  velocity: number;
  density: number;
  bz: number;
  frequency: number;
  decayTime: number;
}

export const TEST_CONDITION_INPUTS = {
  quiet: { velocity: 350, density: 5.0, bz: 2.0 },
  moderate: { velocity: 500, density: 8.0, bz: -7.0 },
  storm: { velocity: 750, density: 2.0, bz: -15.0 },
} as const satisfies Record<string, ChordMappingInput>;

export type TestConditionName = keyof typeof TEST_CONDITION_INPUTS;

function buildConfig(config?: ChordMappingInputConfig) {
  return {
    velocityMin: config?.velocityMin ?? DEFAULT_MAPPING_CONFIG.velocity_min,
    velocityMax: config?.velocityMax ?? DEFAULT_MAPPING_CONFIG.velocity_max,
    midiNoteMin: config?.midiNoteMin ?? DEFAULT_MAPPING_CONFIG.midi_note_min,
    midiNoteMax: config?.midiNoteMax ?? DEFAULT_MAPPING_CONFIG.midi_note_max,
    densityMin: config?.densityMin ?? DEFAULT_MAPPING_CONFIG.density_min,
    densityMax: config?.densityMax ?? DEFAULT_MAPPING_CONFIG.density_max,
    decayTimeMin: config?.decayTimeMin ?? DEFAULT_MAPPING_CONFIG.decay_time_min,
    decayTimeMax: config?.decayTimeMax ?? DEFAULT_MAPPING_CONFIG.decay_time_max,
    bzDetuneCents: config?.bzDetuneCents ?? DEFAULT_MAPPING_CONFIG.bz_detune_cents,
    bzThreshold: config?.bzThreshold ?? DEFAULT_MAPPING_CONFIG.bz_threshold,
  };
}

function storageConfigToInputConfig(
  config?: ChordMappingStorageConfig | null
): ChordMappingInputConfig | undefined {
  if (!config) return undefined;

  return {
    velocityMin: config.velocity_min ?? undefined,
    velocityMax: config.velocity_max ?? undefined,
    midiNoteMin: config.midi_note_min ?? undefined,
    midiNoteMax: config.midi_note_max ?? undefined,
    densityMin: config.density_min ?? undefined,
    densityMax: config.density_max ?? undefined,
    decayTimeMin: config.decay_time_min ?? undefined,
    decayTimeMax: config.decay_time_max ?? undefined,
    bzDetuneCents: config.bz_detune_cents ?? undefined,
    bzThreshold: config.bz_threshold ?? undefined,
  };
}

export function buildMappedChord(input: ChordMappingInput, config?: ChordMappingInputConfig): ChordMappingOutput {
  const mappingConfig = buildConfig(config);
  const chord = mapSolarWindToChord(input.velocity, input.density, input.bz, {
    velocityMin: mappingConfig.velocityMin,
    velocityMax: mappingConfig.velocityMax,
    midiNoteMin: mappingConfig.midiNoteMin,
    midiNoteMax: mappingConfig.midiNoteMax,
    densityMin: mappingConfig.densityMin,
    densityMax: mappingConfig.densityMax,
    decayTimeMin: mappingConfig.decayTimeMin,
    decayTimeMax: mappingConfig.decayTimeMax,
    bzDetuneCents: mappingConfig.bzDetuneCents,
    bzThreshold: mappingConfig.bzThreshold,
  });

  return {
    ...chord,
    baseNote: chord.noteName,
    velocity: input.velocity,
    density: input.density,
    bz: input.bz,
    frequency: Math.round(chord.frequency * 100) / 100,
    decayTime: Math.round(chord.decayTime * 100) / 100,
  };
}

export function buildMappedChordFromStorageConfig(
  input: ChordMappingInput,
  config?: ChordMappingStorageConfig | null
): ChordMappingOutput {
  return buildMappedChord(input, storageConfigToInputConfig(config));
}

export function getTestConditionInput(condition: string): ChordMappingInput | null {
  if (!(condition in TEST_CONDITION_INPUTS)) {
    return null;
  }
  return TEST_CONDITION_INPUTS[condition as TestConditionName];
}
