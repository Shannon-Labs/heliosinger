/**
 * MIDI and audio utility functions for solar wind chime mapping
 */

import type { ChordData, ComprehensiveSpaceWeatherData } from "./types";

// Standard MIDI note numbers for reference
export const MIDI_NOTES = {
  C2: 36,   // Low C
  C3: 48,
  C4: 60,   // Middle C (261.63 Hz)
  C5: 72,
  C6: 84,   // High C
  A4: 69    // Concert A (440 Hz)
} as const;

// Note names for MIDI conversion
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Convert MIDI note number to frequency in Hz
 * Uses equal temperament tuning with A4 = 440 Hz
 */
export function midiNoteToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Convert frequency to MIDI note number (rounded to nearest semitone)
 */
export function frequencyToMidiNote(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

/**
 * Get note name from MIDI note number
 */
export function midiNoteToNoteName(midiNote: number): string {
  const octave = Math.floor((midiNote - 12) / 12);
  const noteIndex = (midiNote - 12) % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Parse note name to MIDI note number
 * Examples: "C4" -> 60, "A#3" -> 58
 */
export function noteNameToMidiNote(noteName: string): number {
  const match = noteName.match(/([A-G]#?)(\d+)/);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);
  
  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr);
  const noteIndex = NOTE_NAMES.indexOf(note as any);
  
  if (noteIndex === -1) throw new Error(`Invalid note: ${note}`);
  
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Convert cents (1/100 of a semitone) to frequency ratio
 */
export function centsToFrequencyRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/**
 * Convert frequency ratio to cents
 */
export function frequencyRatioToCents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

/**
 * Map solar wind velocity to MIDI note using linear interpolation
 */
export function velocityToMidiNote(
  velocity: number,
  minVelocity: number = 200,
  maxVelocity: number = 800,
  minMidiNote: number = MIDI_NOTES.C2,
  maxMidiNote: number = MIDI_NOTES.C6
): number {
  // Clamp velocity to range
  const clampedVelocity = Math.max(minVelocity, Math.min(maxVelocity, velocity));
  
  // Linear interpolation
  const normalizedVelocity = (clampedVelocity - minVelocity) / (maxVelocity - minVelocity);
  const midiNote = minMidiNote + normalizedVelocity * (maxMidiNote - minMidiNote);
  
  return Math.round(midiNote);
}

/**
 * Map plasma density to decay time using logarithmic scaling
 * Low density = long decay (gong-like)
 * High density = short decay (pluck-like)
 */
export function densityToDecayTime(
  density: number,
  minDensity: number = 0.5,
  maxDensity: number = 50.0,
  minDecayTime: number = 0.2,
  maxDecayTime: number = 5.0
): number {
  // Clamp density to range
  const clampedDensity = Math.max(minDensity, Math.min(maxDensity, density));
  
  // Logarithmic mapping (inverted - high density = short decay)
  const logMin = Math.log(minDensity);
  const logMax = Math.log(maxDensity);
  const logDensity = Math.log(clampedDensity);
  
  const normalizedDensity = (logDensity - logMin) / (logMax - logMin);
  
  // Invert so high density = short decay
  const decayTime = maxDecayTime - normalizedDensity * (maxDecayTime - minDecayTime);
  
  return Math.max(minDecayTime, Math.min(maxDecayTime, decayTime));
}

/**
 * Calculate detune amount based on Bz magnetic field
 * Negative (southward) Bz creates detuning for beating effect
 */
export function bzToDetuneCents(
  bz: number,
  threshold: number = -5.0,
  maxDetuneCents: number = -20
): number {
  if (bz >= threshold) {
    return 0; // No detuning for northward or weak southward Bz
  }
  
  // Scale detuning based on how negative Bz is
  const detuneStrength = Math.min(1.0, Math.abs(bz - threshold) / Math.abs(threshold * 2));
  
  return Math.round(maxDetuneCents * detuneStrength);
}

/**
 * Determine space weather condition based on parameters
 */
export function classifySpaceWeatherCondition(
  velocity: number,
  density: number,
  bz: number
): 'quiet' | 'moderate' | 'storm' | 'extreme' {
  // Extreme storm conditions: very high velocity OR extremely negative Bz
  if (velocity > 700 || bz < -15) {
    return 'extreme';
  }
  
  // Storm conditions: high velocity OR very negative Bz
  if (velocity > 600 || bz < -10) {
    return 'storm';
  }
  
  // Moderate conditions: elevated velocity OR moderately negative Bz
  if (velocity > 450 || bz < -5) {
    return 'moderate';
  }
  
  // Default to quiet
  return 'quiet';
}

/**
 * Generate complete chord data from solar wind parameters
 */
export interface ChordMappingConfig {
  velocityMin: number;
  velocityMax: number;
  midiNoteMin: number;
  midiNoteMax: number;
  densityMin: number;
  densityMax: number;
  decayTimeMin: number;
  decayTimeMax: number;
  bzThreshold: number;
  bzDetuneCents: number;
}

export function mapSolarWindToChord(
  velocity: number,
  density: number,
  bz: number,
  config: ChordMappingConfig
): {
  midiNote: number;
  frequency: number;
  noteName: string;
  decayTime: number;
  detuneCents: number;
  condition: 'quiet' | 'moderate' | 'storm' | 'extreme';
} {
  const midiNote = velocityToMidiNote(
    velocity,
    config.velocityMin,
    config.velocityMax,
    config.midiNoteMin,
    config.midiNoteMax
  );
  
  const frequency = midiNoteToFrequency(midiNote);
  const noteName = midiNoteToNoteName(midiNote);
  
  const decayTime = densityToDecayTime(
    density,
    config.densityMin,
    config.densityMax,
    config.decayTimeMin,
    config.decayTimeMax
  );
  
  const detuneCents = bzToDetuneCents(bz, config.bzThreshold, config.bzDetuneCents);
  const condition = classifySpaceWeatherCondition(velocity, density, bz);
  
  return {
    midiNote,
    frequency,
    noteName,
    decayTime,
    detuneCents,
    condition
  };
}

/**
 * Generate musical intervals for harmonic content
 */
export const MUSICAL_INTERVALS = {
  unison: 0,          // 0 cents
  minorSecond: 100,   // 100 cents
  majorSecond: 200,   // 200 cents
  minorThird: 300,    // 300 cents
  majorThird: 400,    // 400 cents
  perfectFourth: 500, // 500 cents
  tritone: 600,       // 600 cents
  perfectFifth: 700,  // 700 cents
  minorSixth: 800,    // 800 cents
  majorSixth: 900,    // 900 cents
  minorSeventh: 1000, // 1000 cents
  majorSeventh: 1100, // 1100 cents
  octave: 1200        // 1200 cents
} as const;

/**
 * Get harmonic frequencies based on fundamental and space weather condition
 */
export function getHarmonicFrequencies(
  fundamental: number,
  condition: 'quiet' | 'moderate' | 'storm' | 'extreme'
): number[] {
  const harmonics = [fundamental]; // Always include fundamental
  
  switch (condition) {
    case 'quiet':
      // Simple, consonant harmony
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.perfectFifth));
      break;
      
    case 'moderate':
      // More complex harmony
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.perfectFifth));
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.octave));
      break;
      
    case 'storm':
      // Dissonant, complex harmony
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.minorSeventh));
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.tritone));
      harmonics.push(fundamental * 0.5); // Sub-harmonic for ominous effect
      break;
      
    case 'extreme':
      // Extremely dissonant and menacing
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.minorSecond)); // Very dissonant
      harmonics.push(fundamental * centsToFrequencyRatio(MUSICAL_INTERVALS.tritone));
      harmonics.push(fundamental * 0.5); // Sub-harmonic
      harmonics.push(fundamental * 0.25); // Ultra-low sub-harmonic for rumble
      break;
  }
  
  return harmonics;
}

/**
 * Map K-index to pulse rate (Hz) for rhythmic modulation
 */
export function kIndexToPulseRate(kp: number): number {
  if (kp <= 2) return 0.5; // Slow, gentle
  if (kp <= 4) return 2.0; // Moderate
  if (kp <= 6) return 4.0; // Fast, urgent
  return 8.0; // Very fast, intense (K7-K9)
}

/**
 * Map X-ray flux to brightness multiplier
 */
export function xrayFluxToBrightness(xrayFlux: number): number {
  if (xrayFlux < 1e-8) return 1.0;
  // Normalize to 0-1 range, then scale to 1.0-2.5x brightness
  const normalized = Math.min(1.0, Math.max(0, (xrayFlux - 1e-8) / 1e-5));
  return 1.0 + (normalized * 1.5);
}

/**
 * Map proton flux to harmonic count
 */
export function protonFluxToHarmonicCount(protonFlux: number): number {
  if (protonFlux < 1) return 0;
  // Log scale: 1-10 → 1 harmonic, 10-100 → 2, 100-1000 → 3, etc.
  const logFlux = Math.log10(protonFlux);
  return Math.min(5, Math.max(0, Math.floor(logFlux)));
}

/**
 * Map electron flux to high-frequency oscillator count
 */
export function electronFluxToHighFreqCount(electronFlux: number): number {
  if (electronFlux < 1) return 0;
  const logFlux = Math.log10(electronFlux);
  return Math.min(3, Math.max(0, Math.floor(logFlux / 2)));
}

/**
 * Map magnetometer H component to rumble intensity
 */
export function magnetometerToRumbleIntensity(hComponent: number, baseline: number = 20000): number {
  const variation = Math.abs(hComponent - baseline);
  return Math.min(1.0, variation / 1000); // Normalize to 0-1
}

/**
 * Generate ChordData from solar wind reading using default configuration
 * This is the main function used by the ambient mode implementation
 */
export function generateChordDataFromSolarWind(solarWindData: {
  velocity: number;
  density: number;
  bz: number;
}): ChordData {
  // Default configuration for chord mapping
  const defaultConfig: ChordMappingConfig = {
    velocityMin: 200,
    velocityMax: 800,
    midiNoteMin: MIDI_NOTES.C2,
    midiNoteMax: MIDI_NOTES.C6,
    densityMin: 0.5,
    densityMax: 50.0,
    decayTimeMin: 0.2,
    decayTimeMax: 5.0,
    bzThreshold: -5.0,
    bzDetuneCents: -20
  };

  // Map solar wind data to chord using existing function
  const chordMapping = mapSolarWindToChord(
    solarWindData.velocity,
    solarWindData.density,
    solarWindData.bz,
    defaultConfig
  );

  // Convert to ChordData interface format
  return {
    baseNote: chordMapping.noteName, // Convert noteName to baseNote
    frequency: chordMapping.frequency,
    midiNote: chordMapping.midiNote,
    decayTime: chordMapping.decayTime,
    detuneCents: chordMapping.detuneCents,
    condition: chordMapping.condition,
    density: solarWindData.density // Include density in the result
  };
}

/**
 * Generate comprehensive ChordData from all space weather parameters
 */
export function generateChordDataFromComprehensive(
  data: ComprehensiveSpaceWeatherData
): ChordData {
  const baseChord = data.solar_wind 
    ? generateChordDataFromSolarWind({
        velocity: data.solar_wind.velocity,
        density: data.solar_wind.density,
        bz: data.solar_wind.bz
      })
    : {
        baseNote: 'C4',
        frequency: 261.63,
        midiNote: 60,
        decayTime: 2.0,
        detuneCents: 0,
        condition: 'quiet' as const,
        density: 5.0
      };

  // Add multi-parameter data
  return {
    ...baseChord,
    kIndex: data.k_index?.kp,
    xrayFlux: data.xray_flux?.short_wave || data.xray_flux?.long_wave,
    protonFlux: data.proton_flux?.flux_10mev,
    electronFlux: data.electron_flux?.flux_2mev,
    magnetometerH: data.magnetometer?.h_component
  };
}
