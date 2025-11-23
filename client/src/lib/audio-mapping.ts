import type { ComprehensiveSpaceWeatherData, ChordData, SpaceWeatherCondition } from "@shared/schema";
import { midiNoteToFrequency } from "./midi-mapping";

// ============================================================================
// SONIFICATION MAPPING FRAMEWORK
// Implements the design from SONIFICATION_DESIGN.md
// ============================================================================

interface EnhancedChordData extends ChordData {
  // Additional base properties
  velocity: number; // Solar wind velocity (km/s)
  
  // Spatial parameters
  stereoSpread: number; // 0-1 (0=mono, 1=full stereo)
  leftGain: number; // 0-1
  rightGain: number; // 0-1
  
  // Harmonic parameters
  harmonicCount: number; // 1-8
  harmonicAmplitudes: number[]; // Array of relative amplitudes
  
  // Modulation parameters
  vibratoDepth: number; // 0-50 cents
  vibratoRate: number; // 0-10 Hz
  tremoloRate: number; // 0-8 Hz (from K-index)
  tremoloDepth: number; // 0-1
  
  // Filter parameters
  filterFrequency: number; // 20-20000 Hz
  filterQ: number; // 0.1-20
  
  // Texture parameters
  shimmerGain: number; // 0-0.3
  rumbleGain: number; // 0-0.5 (sub-bass)
}

// ============================================================================
// MAPPING CONSTANTS
// ============================================================================

const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9]; // Major pentatonic scale intervals
const BASE_OCTAVE = 2; // Starting at C2
const MAX_OCTAVES = 4; // Up to C6

// Physical parameter ranges
const VELOCITY_RANGE = { min: 200, max: 800 }; // km/s
const DENSITY_RANGE = { min: 0.5, max: 50.0 }; // particles/cm³
const TEMPERATURE_RANGE = { min: 10000, max: 200000 }; // Kelvin
const B_FIELD_RANGE = { min: -20, max: 20 }; // nT
const BT_RANGE = { min: 0, max: 20 }; // nT
const K_INDEX_RANGE = { min: 0, max: 9 };

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

export function mapSpaceWeatherToAudio(data: ComprehensiveSpaceWeatherData): EnhancedChordData {
  const solarWind = data.solar_wind;
  const kIndex = data.k_index;
  
  if (!solarWind) {
    throw new Error("Solar wind data is required for audio mapping");
  }

  // Step 1: Calculate foundation (velocity → pitch)
  const { frequency, midiNote, noteName } = calculateFoundationFrequency(solarWind.velocity);
  
  // Step 2: Determine condition and harmonics
  const condition = determineSpaceWeatherCondition(solarWind, kIndex);
  const harmonicData = calculateHarmonicContent(solarWind.density, solarWind.temperature, condition);
  
  // Step 3: Calculate spatial parameters (IMF vector)
  const spatialData = calculateSpatialParameters(solarWind.bz, solarWind.bx || 0, solarWind.by || 0);
  
  // Step 4: Calculate rhythmic parameters (K-index)
  const rhythmicData = calculateRhythmicParameters(kIndex?.kp || 0, condition);
  
  // Step 5: Calculate filter and texture parameters
  const filterData = calculateFilterParameters(solarWind.temperature, solarWind.bt || 5, condition);
  
  // Step 6: Calculate decay time from density
  const decayTime = calculateDecayTime(solarWind.density);
  
  // Step 7: Combine all parameters
  const enhancedData: EnhancedChordData = {
    // Original ChordData fields
    baseNote: noteName,
    frequency,
    midiNote,
    decayTime,
    detuneCents: spatialData.detuneCents,
    condition,
    density: solarWind.density,
    velocity: solarWind.velocity,
    kIndex: kIndex?.kp || 0,
    
    // Enhanced spatial parameters
    stereoSpread: spatialData.stereoSpread,
    leftGain: spatialData.leftGain,
    rightGain: spatialData.rightGain,
    
    // Harmonic parameters
    harmonicCount: harmonicData.count,
    harmonicAmplitudes: harmonicData.amplitudes,
    
    // Modulation parameters
    vibratoDepth: spatialData.vibratoDepth,
    vibratoRate: spatialData.vibratoRate,
    tremoloRate: rhythmicData.rate,
    tremoloDepth: rhythmicData.depth,
    
    // Filter parameters
    filterFrequency: filterData.frequency,
    filterQ: filterData.q,
    
    // Texture parameters
    shimmerGain: filterData.shimmerGain,
    rumbleGain: condition === 'extreme' ? 0.4 : condition === 'storm' ? 0.2 : 0
  };
  
  return enhancedData;
}

// ============================================================================
// FOUNDATION LAYER: VELOCITY → PITCH
// ============================================================================

function calculateFoundationFrequency(velocity: number): {
  frequency: number;
  midiNote: number;
  noteName: string;
} {
  // Normalize velocity to 0-1 range
  const normalizedVelocity = normalizeParameter(velocity, VELOCITY_RANGE.min, VELOCITY_RANGE.max);
  
  // Map to pentatonic scale across 4 octaves
  const totalPentatonicNotes = PENTATONIC_INTERVALS.length * MAX_OCTAVES; // 20 notes
  const noteIndex = Math.floor(normalizedVelocity * (totalPentatonicNotes - 1));
  
  // Calculate which octave and which pentatonic note
  const octaveOffset = Math.floor(noteIndex / PENTATONIC_INTERVALS.length);
  const intervalIndex = noteIndex % PENTATONIC_INTERVALS.length;
  
  // MIDI note: C2 = 36, each octave = 12 semitones
  const midiNote = 36 + (octaveOffset * 12) + PENTATONIC_INTERVALS[intervalIndex];
  
  // Ensure we stay within bounds
  const clampedMidiNote = Math.max(36, Math.min(84, midiNote));
  
  // Convert to frequency
  const frequency = midiNoteToFrequency(clampedMidiNote);
  
  // Get note name
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((clampedMidiNote - 12) / 12);
  const noteNameIndex = (clampedMidiNote - 12) % 12;
  const noteName = `${noteNames[noteNameIndex]}${octave}`;
  
  return { frequency, midiNote: clampedMidiNote, noteName };
}

// ============================================================================
// HARMONIC RICHNESS LAYER: DENSITY + TEMPERATURE
// ============================================================================

interface HarmonicData {
  count: number;
  amplitudes: number[];
}

function calculateHarmonicContent(
  density: number, 
  temperature: number, 
  condition: SpaceWeatherCondition
): HarmonicData {
  // Density controls number of harmonics (1-8)
  const normalizedDensity = normalizeParameter(density, DENSITY_RANGE.min, DENSITY_RANGE.max);
  const harmonicCount = 1 + Math.floor(normalizedDensity * 7); // 1 to 8 harmonics
  
  // Temperature controls spectral tilt (amplitude distribution)
  const normalizedTemp = normalizeParameter(temperature, TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max);
  const spectralTilt = normalizedTemp; // 0 = warm (low harmonics), 1 = bright (high harmonics)
  
  // Calculate harmonic amplitudes based on spectral tilt
  const amplitudes: number[] = [];
  for (let i = 0; i < harmonicCount; i++) {
    const harmonicNumber = i + 1; // 1st, 2nd, 3rd, etc.
    
    // Base amplitude follows 1/harmonicNumber (natural harmonic series)
    let amplitude = 1 / harmonicNumber;
    
    // Apply spectral tilt: high tilt emphasizes higher harmonics
    const tiltFactor = Math.pow(harmonicNumber, spectralTilt * 2);
    amplitude *= tiltFactor;
    
    // Normalize so fundamental is always 1.0
    if (i === 0) {
      amplitude = 1.0;
    } else {
      amplitude /= tiltFactor; // Keep fundamental at 1.0
    }
    
    // Apply condition-based scaling
    if (condition === 'storm' || condition === 'extreme') {
      amplitude *= 1.2; // Slightly louder harmonics during storms
    }
    
    amplitudes.push(Math.min(1.0, amplitude));
  }
  
  return { count: harmonicCount, amplitudes };
}

// ============================================================================
// SPATIAL LAYER: IMF VECTOR (Bx, By, Bz)
// ============================================================================

interface SpatialData {
  stereoSpread: number;
  leftGain: number;
  rightGain: number;
  detuneCents: number;
  vibratoDepth: number;
  vibratoRate: number;
}

function calculateSpatialParameters(
  bz: number,
  bx: number,
  by: number
): SpatialData {
  // Bz: Southward = wide stereo + vibrato, Northward = narrow + stable
  const normalizedBz = normalizeParameter(bz, B_FIELD_RANGE.min, B_FIELD_RANGE.max);
  
  // Stereo spread: 0.1 (northward) to 1.0 (southward extreme)
  let stereoSpread: number;
  if (bz > 0) {
    // Northward: narrow stereo
    stereoSpread = 0.1 + (normalizedBz * 0.2); // 0.1 to 0.3
  } else {
    // Southward: wide stereo, more negative = wider
    stereoSpread = 0.5 + ((1 - normalizedBz) * 0.5); // 0.5 to 1.0
  }
  
  // Bx: Left-right balance offset
  const normalizedBx = normalizeParameter(bx, B_FIELD_RANGE.min, B_FIELD_RANGE.max);
  const balanceOffset = (normalizedBx - 0.5) * 0.6; // -0.3 to +0.3
  
  // Calculate left/right gains with stereo spread and balance
  const leftGain = Math.max(0.1, 0.5 - (stereoSpread / 2) + balanceOffset);
  const rightGain = Math.max(0.1, 0.5 - (stereoSpread / 2) - balanceOffset);
  
  // Bz detuning: Southward Bz creates beating (geomagnetic activity)
  const detuneCents = bz < -5 ? (bz * 2) : 0; // More negative = more detuning
  
  // Vibrato from Bz: Southward = more vibrato
  const vibratoDepth = bz < 0 ? Math.min(50, Math.abs(bz) * 2) : Math.abs(bz) * 0.5;
  const vibratoRate = Math.max(1, Math.min(10, Math.abs(bz) * 0.3));
  
  return {
    stereoSpread,
    leftGain,
    rightGain,
    detuneCents: Math.round(detuneCents),
    vibratoDepth: Math.round(vibratoDepth),
    vibratoRate: Math.round(vibratoRate * 10) / 10
  };
}

// ============================================================================
// RHYTHMIC LAYER: K-INDEX
// ============================================================================

interface RhythmicData {
  rate: number; // Hz
  depth: number; // 0-1
  waveform: OscillatorType;
}

function calculateRhythmicParameters(kp: number, condition: SpaceWeatherCondition): RhythmicData {
  const normalizedKp = normalizeParameter(kp, K_INDEX_RANGE.min, K_INDEX_RANGE.max);
  
  // Pulse rate: 0.5 Hz (quiet) to 8 Hz (extreme storm)
  const rate = 0.5 + (normalizedKp * 7.5);
  
  // Pulse depth: 0.1 (quiet) to 0.8 (storm)
  const depth = 0.1 + (normalizedKp * 0.7);
  
  // Waveform complexity based on Kp
  let waveform: OscillatorType;
  if (kp < 3) {
    waveform = 'sine'; // Smooth, quiet
  } else if (kp < 5) {
    waveform = 'triangle'; // Moderate complexity
  } else if (kp < 7) {
    waveform = 'square'; // Sharp, active
  } else {
    waveform = 'sawtooth'; // Harsh, extreme
  }
  
  return { rate, depth, waveform };
}

// ============================================================================
// FILTER & TEXTURE LAYER: TEMPERATURE + BT
// ============================================================================

interface FilterData {
  frequency: number;
  q: number;
  shimmerGain: number;
}

function calculateFilterParameters(
  temperature: number, 
  bt: number,
  condition: SpaceWeatherCondition
): FilterData {
  // Temperature affects filter frequency (brightness)
  const normalizedTemp = normalizeParameter(temperature, TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max);
  const baseFrequency = 200 + (normalizedTemp * 1800); // 200-2000 Hz base
  
  // Bt affects filter resonance and overall brightness
  const normalizedBt = normalizeParameter(bt, BT_RANGE.min, BT_RANGE.max);
  const q = 1 + (normalizedBt * 7); // 1-8 resonance
  
  // High-temperature shimmer (noise texture)
  const shimmerGain = normalizedTemp > 0.7 ? (normalizedTemp - 0.7) * 0.3 : 0;
  
  // Adjust for storm conditions
  let finalFrequency = baseFrequency;
  if (condition === 'storm' || condition === 'extreme') {
    finalFrequency *= 1.2; // Slightly brighter during storms
  }
  
  return {
    frequency: Math.min(20000, finalFrequency),
    q: Math.min(20, q),
    shimmerGain
  };
}

// ============================================================================
// DECAY TIME: DENSITY
// ============================================================================

function calculateDecayTime(density: number): number {
  // Denser plasma = shorter decay (more damping)
  const normalizedDensity = normalizeParameter(density, DENSITY_RANGE.min, DENSITY_RANGE.max);
  
  // Inverse relationship: high density = short decay, low density = long decay
  const decayTime = 5.0 - (normalizedDensity * 4.8); // 5.0 to 0.2 seconds
  
  return Math.max(0.2, Math.min(5.0, decayTime));
}

// ============================================================================
// CONDITION DETERMINATION
// ============================================================================

function determineSpaceWeatherCondition(
  solarWind: NonNullable<ComprehensiveSpaceWeatherData['solar_wind']>,
  kIndex: ComprehensiveSpaceWeatherData['k_index']
): SpaceWeatherCondition {
  const kp = kIndex?.kp || 0;
  const velocity = solarWind.velocity;
  const bz = solarWind.bz;
  
  // Extreme condition: Kp >= 7 OR (Kp >= 5 AND strong southward Bz)
  if (kp >= 7 || (kp >= 5 && bz < -15)) {
    return 'extreme';
  }
  
  // Storm condition: Kp >= 5 OR strong southward Bz OR high velocity
  if (kp >= 5 || bz < -10 || velocity > 600) {
    return 'storm';
  }
  
  // Moderate condition: Kp 3-4 OR moderate Bz/velocity
  if (kp >= 3 || (Math.abs(bz) > 5 && velocity > 450)) {
    return 'moderate';
  }
  
  return 'quiet';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeParameter(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

// ============================================================================
// MISSING DATA HANDLING
// ============================================================================

export function createDefaultAudioMapping(): EnhancedChordData {
  return {
    baseNote: 'C2',
    frequency: 65.41,
    midiNote: 36,
    decayTime: 3.0,
    detuneCents: 0,
    condition: 'quiet',
    density: 5,
    velocity: 350,
    kIndex: 1,
    stereoSpread: 0.1,
    leftGain: 0.5,
    rightGain: 0.5,
    harmonicCount: 2,
    harmonicAmplitudes: [1.0, 0.5],
    vibratoDepth: 2,
    vibratoRate: 1,
    tremoloRate: 0.5,
    tremoloDepth: 0.1,
    filterFrequency: 800,
    filterQ: 1,
    shimmerGain: 0,
    rumbleGain: 0
  };
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type { EnhancedChordData, HarmonicData, SpatialData, RhythmicData, FilterData };
