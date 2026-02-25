/**
 * Heliosinger: The Sun Sings Space Weather
 * 
 * Enhanced mapping framework that makes the sun literally sing
 * by mapping space weather parameters to vowel sounds and musical parameters
 */

import type { ComprehensiveSpaceWeatherData, ChordData, SpaceWeatherCondition } from "./types";
import { midiNoteToFrequency } from "./midi";
import { deriveSpaceWeatherCondition } from "../space-weather";
import { 
  VOWEL_FORMANTS, 
  VowelName, 
  VowelFormants,
  getVowelFromSpaceWeather,
  getSolarMoodDescription,
  getFormantFiltersForVowel,
  createVowelFilterContext,
  type VowelFilterContext,
  type VowelFilterOptions,
} from "./vowel-filters";
import { getChordQuality, type ChordQuality } from "./chord-utils";
import {
  calculateTailMetrics,
  createPlasmatailState,
  QUIET_TAIL_ENERGY_J,
  type PlasmatailState,
  SubstormPhase,
  type TailDerivedMetrics,
} from "./plasmatail";

// ============================================================================
// HELIOSINGER AUDIO DATA INTERFACE
// ============================================================================

export interface ChordTone {
  frequency: number;
  midiNote: number;
  noteName: string;
  amplitude: number; // Relative amplitude (0-1), fundamental is always 1.0
}

export interface HeliosingerData extends ChordData {
  // Core space weather parameters
  velocity: number;
  bz: number;
  
  // Vowel singing parameters
  currentVowel: VowelFormants;
  vowelName: VowelName;
  vowelDescription: string;
  solarMood: string;
  
  // Chord Quality Metadata (New)
  chordQuality: ChordQuality;
  
  // Formant filter parameters
  formantFilters: Array<{
    frequency: number;
    bandwidth: number;
    gain: number;
  }>;
  
  // Chord voicing (multiple notes for harmony)
  chordVoicing: ChordTone[];
  
  // Enhanced spatial and harmonic parameters (from previous enhanced system)
  stereoSpread: number;
  leftGain: number;
  rightGain: number;
  harmonicCount: number;
  harmonicAmplitudes: number[];
  vibratoDepth: number;
  vibratoRate: number;
  tremoloRate: number;
  tremoloDepth: number;
  filterFrequency: number;
  filterQ: number;
  shimmerGain: number;
  rumbleGain: number;
  
  // Reverb and delay parameters
  reverbRoomSize: number;
  delayTime: number;
  delayFeedback: number;
  delayGain: number;

  // Binaural drift layer (calming dual-tone beat)
  binauralBeatHz: number;
  binauralBaseHz: number;
  binauralMix: number;

  // Magnetotail-derived science metrics
  tailMetrics: TailDerivedMetrics;
}

// ============================================================================
// MAIN HELIOSINGER MAPPING FUNCTION
// ============================================================================

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ensureFinite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const normalizeLinear = (value: number, min: number, max: number) => {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return 0;
  }
  return clamp((value - min) / span, 0, 1);
};
const normalizeLog10 = (value: number, minExponent: number, maxExponent: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return normalizeLinear(Math.log10(value), minExponent, maxExponent);
};
const parseTimestampMs = (timestamp?: string) => {
  if (!timestamp) {
    return null;
  }
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
};

const PLASMA_BETA_COEFFICIENT = 3.4699494e-5; // β = 3.4699494e-5 * n(cm^-3) * T(K) / B(nT)^2
const MIN_FIELD_NT = 1e-3;
const MIN_ALFVEN_SPEED = 1e-3;
const MAX_MACH_SENTINEL = 1e3;

export interface MappingContext {
  previousData: ComprehensiveSpaceWeatherData | null;
  previousDerivedMetrics: DerivedMetrics | null;
  tailState: PlasmatailState;
  vowelFilterContext: VowelFilterContext;
}

export interface MappingOptions {
  now?: number;
}

function getMappingNow(
  data: ComprehensiveSpaceWeatherData,
  options?: MappingOptions
): number {
  if (options?.now !== undefined) {
    return options.now;
  }

  const parsedNow = Date.parse(data.solar_wind?.timestamp ?? data.timestamp);
  return Number.isFinite(parsedNow) ? parsedNow : 0;
}

export function createMappingContext(): MappingContext {
  return {
    previousData: null,
    previousDerivedMetrics: null,
    tailState: createPlasmatailState(),
    vowelFilterContext: createVowelFilterContext(),
  };
}

export function mapSpaceWeatherToHeliosinger(
  data: ComprehensiveSpaceWeatherData,
  context: MappingContext,
  options?: MappingOptions
): HeliosingerData {
  const solarWind = data.solar_wind;
  const kIndex = data.k_index;
  
  if (!solarWind) {
    throw new Error("Solar wind data is required for Heliosinger mapping");
  }

  // Step 1: Calculate foundation (velocity → pitch) - same as before
  const { frequency, midiNote, noteName } = calculateFoundationFrequency(solarWind.velocity);
  
  // Step 2: Determine space weather condition
  const condition = deriveSpaceWeatherCondition({
    kp: kIndex?.kp,
    velocity: solarWind.velocity,
    bz: solarWind.bz,
  });

  const now = getMappingNow(data, options);
  const vowelOptions: VowelFilterOptions = { now };
  
  // Step 3: Calculate derived metrics from solar wind parameters
  const derivedMetrics = calculateDerivedMetrics(
    solarWind.density,
    solarWind.velocity,
    solarWind.bx || 0,
    solarWind.by || 0,
    solarWind.bz,
    solarWind.temperature
  );
  
  // Step 4: Get the vowel the sun is singing based on parameters (including velocity)
  const currentVowel = getVowelFromSpaceWeather(
    solarWind.density,
    solarWind.temperature,
    solarWind.bz,
    kIndex?.kp || 0,
    solarWind.velocity,
    context.vowelFilterContext,
    vowelOptions
  );
  
  // Step 5: Calculate formant filters for the vowel
  const formantFilters = getFormantFiltersForVowel(currentVowel, frequency);
  
  // Step 6: Calculate harmonic content (density + temperature + Mach number)
  const harmonicData = calculateHarmonicContent(
    solarWind.density, 
    solarWind.temperature, 
    condition,
    derivedMetrics.machNumber
  );
  
  // Step 7: Calculate spatial parameters (IMF vector + clock angle + derived metrics)
  const spatialData = calculateSpatialParameters(
    solarWind.bz, 
    solarWind.bx || 0, 
    solarWind.by || 0,
    derivedMetrics.clockAngle,
    derivedMetrics.totalField,
    derivedMetrics.machNumber,
    derivedMetrics.electricField
  );
  
  // Step 8: Calculate rhythmic parameters (K-index + magnetometer)
  const rhythmicData = calculateRhythmicParameters(
    kIndex?.kp || 0, 
    condition,
    data.magnetometer,
    context.previousData?.magnetometer
  );
  
  // Step 9: Calculate filter and texture parameters (temperature + BT + flux data + plasma beta)
  const filterData = calculateFilterParameters(
    solarWind.temperature, 
    solarWind.bt || derivedMetrics.totalField, 
    condition,
    data.xray_flux,
    data.electron_flux,
    derivedMetrics.plasmaBeta,
    context.previousData?.xray_flux
  );
  
  // Step 10: Calculate decay time from density
  const decayTime = calculateDecayTime(solarWind.density);
  
  // Step 11: Calculate chord voicing (harmony) - using harmonic series and space weather parameters
  const chordVoicing = calculateChordVoicing(
    frequency, 
    midiNote, 
    noteName, 
    condition,
    solarWind.density,
    solarWind.temperature,
    solarWind.bz,
    kIndex?.kp || 0
  );
  
  // Step 12: Calculate reverb and delay parameters (density + temperature + proton flux + Pdyn)
  const reverbDelayData = calculateReverbDelay(
    solarWind.density, 
    solarWind.temperature, 
    condition,
    data.proton_flux,
    derivedMetrics.dynamicPressure,
    context.previousDerivedMetrics?.dynamicPressure
  );
  
  // Step 13: Calculate rumble gain from proton flux
  const rumbleGain = calculateRumbleGain(condition, data.proton_flux);

  // Step 14: Calming binaural beat layer (time + condition aware)
  const binauralData = calculateBinauralBeat(
    frequency,
    condition,
    kIndex?.kp || 0,
    solarWind.velocity,
    solarWind.density,
    now
  );

  // Step 14.5: Calculate detailed chord quality metadata
  const chordQuality = getChordQuality(
    condition,
    chordVoicing,
    solarWind.temperature,
    solarWind.density,
    solarWind.bz,
    kIndex?.kp
  );

  // Step 14.7: Magnetotail-derived substorm and energy-loading sonification
  const tailMetricResult = calculateTailMetrics(
    {
      nowMs: now,
      velocity: solarWind.velocity,
      bz: solarWind.bz,
      dynamicPressure: derivedMetrics.dynamicPressure,
      reconnectionScore: data.reconnection?.score,
      electricFieldMvM: Math.max(0, derivedMetrics.electricField),
    },
    context.tailState
  );
  const tailMetrics = tailMetricResult.metrics;
  context.tailState = tailMetricResult.nextState;

  const baseChordVoicing = [...chordVoicing];
  const sheetTension = clamp((5 - tailMetrics.dSheet) / 4.5, 0, 1);
  const stretchingIntensity = clamp(tailMetrics.stretchingProgress, 0, 1);
  const phaseActivity = tailMetrics.phase === SubstormPhase.QUIET ? 0
    : tailMetrics.phase === SubstormPhase.RECOVERY ? 0.3
    : 1;
  const tailEnergyIndex = clamp(
    Math.log10(Math.max(1, tailMetrics.eTail / QUIET_TAIL_ENERGY_J)) / 5,
    0, 1
  ) * phaseActivity;
  const reentryOnset = tailMetrics.phase === SubstormPhase.ONSET;
  const reentryExpansion = tailMetrics.phase === SubstormPhase.EXPANSION;
  const reentryRecovery = tailMetrics.phase === SubstormPhase.RECOVERY;

  const onsetReverbBoost = reentryOnset ? (0.35 * (0.6 + stretchingIntensity)) : 0;
  const expansionReverbBoost = reentryExpansion ? (0.2 * (0.7 + stretchingIntensity)) : 0;
  const recoveryRelaxFactor = reentryRecovery ? 0.85 : 1;

  const tailFilterFrequency = clamp(
    (filterData.frequency + 170 * sheetTension) * (1 + 0.15 * tailEnergyIndex) * recoveryRelaxFactor,
    20,
    20000
  );
  const tailFilterQ = clamp(filterData.q * (1 - sheetTension * 0.35), 0.5, 20);
  const tailShimmerGain = clamp(
    Math.max(
      filterData.shimmerGain,
      0.02 + sheetTension * 0.2 + tailEnergyIndex * 0.08 - 0.1 * Number(reentryRecovery)
    ),
    0,
    0.8
  );

  let tailRumbleGain = clamp(
    rumbleGain + 0.25 * tailEnergyIndex + 0.12 * sheetTension + (reentryOnset ? 0.08 : 0) - (reentryRecovery ? 0.04 : 0),
    0,
    0.9
  );

  const tailReverbRoomSize = clamp(
    reverbDelayData.reverbRoomSize + onsetReverbBoost + expansionReverbBoost,
    0.1,
    1
  );
  const tailDelayGain = clamp(
    reverbDelayData.delayGain + onsetReverbBoost * 0.15 + expansionReverbBoost * 0.12 + 0.02 * Number(reentryOnset),
    0.1,
    0.5
  );
  const tailDelayTime = clamp(
    reverbDelayData.delayTime + onsetReverbBoost * 0.2 + expansionReverbBoost * 0.1,
    0.1,
    1.2
  );

  if (reentryOnset) {
    const onsetMinorSecond = createChordToneFromInterval(frequency, midiNote, noteName, 1, 0.3);
    const onsetTritone = createChordToneFromInterval(frequency, midiNote, noteName, 6, 0.25);
    baseChordVoicing.push(onsetMinorSecond, onsetTritone);
  } else if (reentryExpansion) {
    const expansionSeventh = createChordToneFromInterval(frequency, midiNote, noteName, 10, 0.22);
    baseChordVoicing.push(expansionSeventh);
  }
  
  // Step 15: Combine all parameters into Heliosinger data
  const heliosingerData: HeliosingerData = {
    // Original ChordData fields
    baseNote: noteName,
    frequency,
    midiNote,
    decayTime,
    detuneCents: spatialData.detuneCents,
    condition,
    density: solarWind.density,
    velocity: solarWind.velocity,
    bz: solarWind.bz,
    kIndex: kIndex?.kp || 0,
    
    // Heliosinger vowel singing fields
    currentVowel,
    vowelName: currentVowel.name,
    vowelDescription: currentVowel.description,
    solarMood: getSolarMoodDescription(
      currentVowel, 
      condition, 
      solarWind.velocity, 
      solarWind.density, 
      solarWind.bz, 
      kIndex?.kp,
      vowelOptions
    ),
    chordQuality, // Add the new field
    formantFilters,
    
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
    filterFrequency: tailFilterFrequency,
    filterQ: tailFilterQ,
    
    // Texture parameters
    shimmerGain: tailShimmerGain,
    rumbleGain: tailRumbleGain,
    
    // Chord voicing
    chordVoicing: baseChordVoicing,
    
    // Reverb and delay
    reverbRoomSize: tailReverbRoomSize,
    delayTime: tailDelayTime,
    delayFeedback: reverbDelayData.delayFeedback,
    delayGain: tailDelayGain,

    // Binaural layer
    binauralBeatHz: binauralData.beatHz,
    binauralBaseHz: binauralData.baseHz,
    binauralMix: clamp(
      Math.max(
        binauralData.mix,
        reentryOnset ? 0.15 : reentryExpansion ? 0.12 : reentryRecovery ? 0.06 : 0
      ),
      0.05,
      0.2
    ),

    // New magnetotail-derived science metrics
    tailMetrics,
  };
  
  // Store current data for next call (for spike detection)
  context.previousData = data;
  context.previousDerivedMetrics = derivedMetrics;
  
  return heliosingerData;
}

// ============================================================================
// FOUNDATION LAYER: VELOCITY → PITCH (PENTATONIC)
// ============================================================================

function calculateFoundationFrequency(velocity: number): {
  frequency: number;
  midiNote: number;
  noteName: string;
} {
  const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9];
  const VELOCITY_RANGE = { min: 200, max: 800 };
  
  // Normalize velocity to 0-1 range
  const normalizedVelocity = Math.max(0, Math.min(1, (velocity - VELOCITY_RANGE.min) / (VELOCITY_RANGE.max - VELOCITY_RANGE.min)));
  
  // Map to pentatonic scale across 4 octaves
  const totalPentatonicNotes = PENTATONIC_INTERVALS.length * 4;
  const noteIndex = Math.floor(normalizedVelocity * (totalPentatonicNotes - 1));
  
  // Calculate which octave and which pentatonic note
  const octaveOffset = Math.floor(noteIndex / PENTATONIC_INTERVALS.length);
  const intervalIndex = noteIndex % PENTATONIC_INTERVALS.length;
  
  // MIDI note: C2 = 36, each octave = 12 semitones
  const midiNote = 36 + (octaveOffset * 12) + PENTATONIC_INTERVALS[intervalIndex];
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
// HARMONIC RICHNESS: DENSITY + TEMPERATURE
// ============================================================================

interface HarmonicData {
  count: number;
  amplitudes: number[];
}

function calculateHarmonicContent(
  density: number, 
  temperature: number, 
  condition: SpaceWeatherCondition,
  machNumber?: number
): HarmonicData {
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  
  // Density controls number of harmonics (1-8)
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  let harmonicCount = 1 + Math.floor(normalizedDensity * 7);
  
  // Mach number → increase harmonic count cap (super-Alfvénic → more energetic texture)
  if (machNumber !== undefined) {
    const MA_RANGE = { min: 0, max: 10 };
    const normalizedMA = Math.max(0, Math.min(1, machNumber / MA_RANGE.max));
    // Increase harmonic count cap based on Mach number
    harmonicCount = Math.min(12, harmonicCount + Math.floor(normalizedMA * 4));
  }
  
  // Temperature controls spectral tilt
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - TEMPERATURE_RANGE.min) / (TEMPERATURE_RANGE.max - TEMPERATURE_RANGE.min)));
  const spectralTilt = normalizedTemp;
  
  // Calculate harmonic amplitudes
  const amplitudes: number[] = [];
  for (let i = 0; i < harmonicCount; i++) {
    const harmonicNumber = i + 1;
    
    // Base amplitude follows 1/harmonicNumber
    let amplitude = 1 / harmonicNumber;
    
    // Apply spectral tilt: high tilt emphasizes higher harmonics
    const tiltFactor = Math.pow(harmonicNumber, spectralTilt * 2);
    
    if (i === 0) {
      amplitude = 1;
    } else {
      amplitude *= tiltFactor;
    }
    
    // Boost during storms
    if (condition === 'storm' || condition === 'extreme') {
      amplitude *= 1.2;
    }
    
    amplitudes.push(Math.min(1.0, amplitude));
  }
  
  return { count: harmonicCount, amplitudes };
}

// ============================================================================
// DERIVED METRICS COMPUTATION
// ============================================================================

interface DerivedMetrics {
  dynamicPressure: number; // Pdyn in nPa
  clockAngle: number; // θc in radians
  totalField: number; // BT in nT
  electricField: number; // Ey in mV/m
  alfvenSpeed: number; // Va in km/s
  machNumber: number; // MA (dimensionless)
  plasmaBeta: number; // β (dimensionless)
}

function calculateDerivedMetrics(
  density: number, // n in cm⁻³
  velocity: number, // Vsw in km/s
  bx: number,
  by: number,
  bz: number,
  temperature: number // T in K
): DerivedMetrics {
  const safeDensity = Number.isFinite(density) && density > 0 ? density : 0;
  const safeVelocity = ensureFinite(velocity, 0);
  const safeBx = ensureFinite(bx, 0);
  const safeBy = ensureFinite(by, 0);
  const safeBz = ensureFinite(bz, 0);
  const safeTemperature = Number.isFinite(temperature) && temperature > 0 ? temperature : 0;

  // Dynamic pressure: Pdyn = 1.6726e-6 * n * v² (nPa)
  const dynamicPressure = ensureFinite(1.6726e-6 * safeDensity * safeVelocity * safeVelocity, 0);
  
  // Total magnetic field: BT = sqrt(Bx² + By² + Bz²)
  const totalField = ensureFinite(Math.sqrt(safeBx * safeBx + safeBy * safeBy + safeBz * safeBz), 0);
  
  // IMF clock angle: θc = atan2(By, Bz)
  const clockAngle = ensureFinite(Math.atan2(safeBy, safeBz), 0);
  
  // Interplanetary electric field: Ey = -Vsw * Bz (mV/m, GSM)
  const electricField = ensureFinite(-safeVelocity * safeBz * 1e-3, 0); // Convert to mV/m
  
  // Alfvén speed: Va = 21.8 * BT / sqrt(n) (km/s)
  // where BT is in nT and n is in cm⁻³
  const alfvenSpeed = safeDensity > 0
    ? ensureFinite(21.8 * totalField / Math.sqrt(safeDensity), 0)
    : 0;
  
  // Alfvén Mach number: MA = Vsw / Va
  const machNumberRaw = alfvenSpeed > MIN_ALFVEN_SPEED
    ? safeVelocity / alfvenSpeed
    : (safeVelocity > 0 ? MAX_MACH_SENTINEL : 0);
  const machNumber = clamp(ensureFinite(machNumberRaw, 0), 0, MAX_MACH_SENTINEL);
  
  // Plasma beta approximation: β ∝ n * T / BT²
  // Using SI-derived coefficient for n in cm^-3, T in K, B in nT.
  // where n is in cm⁻³, T is in K, BT is in nT
  const safeTotalField = Math.max(totalField, MIN_FIELD_NT);
  const plasmaBeta = safeDensity > 0 && safeTemperature > 0
    ? ensureFinite(
      PLASMA_BETA_COEFFICIENT * safeDensity * safeTemperature / (safeTotalField * safeTotalField),
      0
    )
    : 0;
  
  return {
    dynamicPressure: ensureFinite(dynamicPressure, 0),
    clockAngle: ensureFinite(clockAngle, 0),
    totalField: ensureFinite(totalField, 0),
    electricField: ensureFinite(electricField, 0),
    alfvenSpeed: ensureFinite(alfvenSpeed, 0),
    machNumber: ensureFinite(machNumber, 0),
    plasmaBeta: ensureFinite(plasmaBeta, 0)
  };
}

// ============================================================================
// SPATIAL LAYER: IMF VECTOR + CLOCK ANGLE
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
  by: number,
  clockAngle?: number,
  totalField?: number,
  machNumber?: number,
  electricField?: number
): SpatialData {
  const B_FIELD_RANGE = { min: -20, max: 20 };
  
  const safeBz = ensureFinite(bz, 0);
  const safeBx = ensureFinite(bx, 0);
  const safeBy = ensureFinite(by, 0);
  const normalizedBz = normalizeLinear(safeBz, B_FIELD_RANGE.min, B_FIELD_RANGE.max);
  
  // Stereo spread: 0.1 (northward) to 1.0 (southward)
  let stereoSpread: number;
  if (safeBz > 0) {
    stereoSpread = 0.1 + (normalizedBz * 0.2);
  } else {
    stereoSpread = 0.5 + ((1 - normalizedBz) * 0.5);
  }
  
  // Clock angle → slow auto-pan sweep; speed proportional to |By|
  if (clockAngle !== undefined) {
    // Map clock angle (0 to 2π) to stereo pan position (-1 to 1)
    const panPosition = Math.sin(ensureFinite(clockAngle, 0));
    // Speed of rotation proportional to |By|
    const byMagnitude = Math.abs(safeBy);
    const rotationSpeed = Math.min(1, byMagnitude / 10); // Normalize to 0-1
    // Apply clock angle influence to stereo spread
    stereoSpread = 0.5 + panPosition * 0.3 * rotationSpeed;
  }
  
  // Bx: Left-right balance
  const normalizedBx = normalizeLinear(safeBx, B_FIELD_RANGE.min, B_FIELD_RANGE.max);
  const balanceOffset = (normalizedBx - 0.5) * 0.6;
  
  const leftGain = Math.max(0.1, 0.5 - (stereoSpread / 2) + balanceOffset);
  const rightGain = Math.max(0.1, 0.5 - (stereoSpread / 2) - balanceOffset);
  
  // Bz detuning and vibrato
  let detuneCents = safeBz < -5 ? (safeBz * 2) : 0;
  let vibratoDepth = safeBz < 0 ? Math.min(50, Math.abs(safeBz) * 2) : Math.abs(safeBz) * 0.5;
  let vibratoRate = Math.max(1, Math.min(10, Math.abs(safeBz) * 0.3));
  
  // Total field BT → bias brightness/harmonics (affects vibrato depth)
  if (totalField !== undefined) {
    const BT_RANGE = { min: 0, max: 20 };
    const normalizedBT = normalizeLinear(ensureFinite(totalField, 0), BT_RANGE.min, BT_RANGE.max);
    // Higher BT → more vibrato depth
    vibratoDepth *= (1 + normalizedBT * 0.5);
  }
  
  // Mach number → scale vibrato/tremolo depth
  if (machNumber !== undefined) {
    const MA_RANGE = { min: 0, max: 10 };
    const normalizedMA = clamp(ensureFinite(machNumber, 0) / MA_RANGE.max, 0, 1);
    // Super-Alfvénic → more energetic texture
    vibratoDepth *= (1 + normalizedMA * 0.3);
    vibratoRate *= (1 + normalizedMA * 0.2);
  }
  
  // Electric field Ey → modulation intensity
  if (electricField !== undefined) {
    const EY_RANGE = { min: -5, max: 5 }; // mV/m typical range
    const normalizedEy = clamp(Math.abs(ensureFinite(electricField, 0)) / Math.abs(EY_RANGE.max), 0, 1);
    // Higher Ey → more agitation (faster vibrato)
    vibratoRate *= (1 + normalizedEy * 0.4);
  }
  
  return {
    stereoSpread: clamp(ensureFinite(stereoSpread, 0.5), 0.1, 1.0),
    leftGain: clamp(ensureFinite(leftGain, 0.5), 0.1, 1.0),
    rightGain: clamp(ensureFinite(rightGain, 0.5), 0.1, 1.0),
    detuneCents: Math.round(ensureFinite(detuneCents, 0)),
    vibratoDepth: Math.round(clamp(ensureFinite(vibratoDepth, 0), 0, 100)),
    vibratoRate: Math.round(clamp(ensureFinite(vibratoRate, 1), 0.1, 15) * 10) / 10
  };
}

// ============================================================================
// RHYTHMIC LAYER: K-INDEX + MAGNETOMETER
// ============================================================================

interface RhythmicData {
  rate: number;
  depth: number;
  waveform: "sine" | "triangle" | "square" | "sawtooth";
}

function calculateRhythmicParameters(
  kp: number, 
  condition: SpaceWeatherCondition,
  magnetometer?: ComprehensiveSpaceWeatherData['magnetometer'],
  previousMagnetometer?: ComprehensiveSpaceWeatherData['magnetometer']
): RhythmicData {
  const K_INDEX_RANGE = { min: 0, max: 9 };
  
  const normalizedKp = normalizeLinear(ensureFinite(kp, 0), K_INDEX_RANGE.min, K_INDEX_RANGE.max);
  
  let rate = 0.5 + (normalizedKp * 7.5);
  let depth = 0.1 + (normalizedKp * 0.7);
  
  // Magnetometer H component → slow pulses and occasional LF "thuds"
  if (magnetometer?.h_component !== undefined && Number.isFinite(magnetometer.h_component)) {
    const H_RANGE = { min: -200, max: 200 }; // nT typical range for Boulder H
    const normalizedH = normalizeLinear(magnetometer.h_component, H_RANGE.min, H_RANGE.max);
    const hMagnitude = Math.abs((normalizedH - 0.5) * 2); // 0 near baseline, 1 near extremes
    
    // Calculate dH/dt (rate of change) for sharp changes
    if (
      previousMagnetometer?.h_component !== undefined &&
      Number.isFinite(previousMagnetometer.h_component)
    ) {
      const nowMs = parseTimestampMs(magnetometer.timestamp);
      const prevMs = parseTimestampMs(previousMagnetometer.timestamp);
      const dtSeconds = nowMs !== null && prevMs !== null && nowMs > prevMs
        ? Math.max(1, (nowMs - prevMs) / 1000)
        : 1;
      const dHdt = Math.abs(magnetometer.h_component - previousMagnetometer.h_component) / dtSeconds;
      const DH_RANGE = { min: 0, max: 50 }; // nT/s
      const normalizedDH = normalizeLinear(dHdt, DH_RANGE.min, DH_RANGE.max);
      
      // Sharp changes → increase tremolo depth (LF "thuds")
      depth = Math.max(depth, normalizedDH * 0.8);
      
      // Large H magnitude → slower pulses
      if (hMagnitude > 0.5) {
        rate *= (1 - hMagnitude * 0.4); // Slow down pulses
      }
    }
  }
  
  let waveform: "sine" | "triangle" | "square" | "sawtooth";
  if (kp < 3) {
    waveform = 'sine';
  } else if (kp < 5) {
    waveform = 'triangle';
  } else if (kp < 7) {
    waveform = 'square';
  } else {
    waveform = 'sawtooth';
  }
  
  return {
    rate: clamp(ensureFinite(rate, 0.5), 0.1, 10),
    depth: clamp(ensureFinite(depth, 0.1), 0, 1),
    waveform
  };
}

// ============================================================================
// FILTER & TEXTURE: TEMPERATURE + BT + FLUX DATA
// ============================================================================

interface FilterData {
  frequency: number;
  q: number;
  shimmerGain: number;
  xrayBoost: number; // Transient boost from X-ray flux spikes
}

function calculateFilterParameters(
  temperature: number, 
  bt: number,
  condition: SpaceWeatherCondition,
  xrayFlux?: ComprehensiveSpaceWeatherData['xray_flux'],
  electronFlux?: ComprehensiveSpaceWeatherData['electron_flux'],
  plasmaBeta?: number,
  previousXrayFlux?: ComprehensiveSpaceWeatherData['xray_flux']
): FilterData {
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  const BT_RANGE = { min: 0, max: 20 };
  const ELECTRON_LOG_RANGE = { min: 3, max: 6 };
  const XRAY_LOG_RANGE = { min: -8, max: -3 };
  const BETA_LOG_RANGE = { min: -2, max: 3 };
  
  const normalizedTemp = normalizeLinear(ensureFinite(temperature, TEMPERATURE_RANGE.min), TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max);
  let baseFrequency = 200 + (normalizedTemp * 1800);
  
  const normalizedBt = normalizeLinear(ensureFinite(bt, 0), BT_RANGE.min, BT_RANGE.max);
  let q = 1 + (normalizedBt * 7);
  
  // Base shimmer gain from temperature
  let shimmerGain = normalizedTemp > 0.7 ? (normalizedTemp - 0.7) * 0.3 : 0;
  
  // Enhance shimmer gain from electron flux (high-frequency shimmer/air)
  if (electronFlux?.flux_2mev !== undefined && Number.isFinite(electronFlux.flux_2mev)) {
    const normalizedElectron = normalizeLog10(electronFlux.flux_2mev, ELECTRON_LOG_RANGE.min, ELECTRON_LOG_RANGE.max);
    shimmerGain = Math.max(shimmerGain, normalizedElectron * 0.4);
  }
  
  // X-ray flux spikes → brief brightness boost and filter opening
  let xrayBoost = 0;
  if (xrayFlux?.short_wave !== undefined && Number.isFinite(xrayFlux.short_wave)) {
    const normalizedXray = normalizeLog10(xrayFlux.short_wave, XRAY_LOG_RANGE.min, XRAY_LOG_RANGE.max);
    // Detect spikes (values above 70% of range indicate flares)
    if (normalizedXray > 0.7) {
      xrayBoost = (normalizedXray - 0.7) * 0.3; // 0 to 0.09 boost
    }
    
    // Detect transient spikes (sudden increases) - compare with previous value
    if (
      previousXrayFlux?.short_wave !== undefined &&
      Number.isFinite(previousXrayFlux.short_wave) &&
      previousXrayFlux.short_wave > 0 &&
      xrayFlux.short_wave > 0
    ) {
      const spikeRatio = xrayFlux.short_wave / previousXrayFlux.short_wave;
      // If flux increased by more than 2x, it's a spike
      if (Number.isFinite(spikeRatio) && spikeRatio > 2.0) {
        // Additional boost for transient spike (0.1-0.2s tempo bump effect)
        const spikeIntensity = Math.min(1, (spikeRatio - 2.0) / 10); // Normalize spike intensity
        xrayBoost = Math.max(xrayBoost, spikeIntensity * 0.15); // Additional 0-0.15 boost
      }
    }
  }
  
  // Plasma beta affects filter brightness and tilt
  if (plasmaBeta !== undefined && Number.isFinite(plasmaBeta) && plasmaBeta > 0) {
    const normalizedBeta = normalizeLog10(plasmaBeta, BETA_LOG_RANGE.min, BETA_LOG_RANGE.max); // Log scale 0.01 to 1000
    // High beta → brighter filter (higher frequency)
    baseFrequency *= (1 + normalizedBeta * 0.2);
    // High beta → more open filter (lower Q)
    q *= (1 - normalizedBeta * 0.3);
  }
  
  let finalFrequency = baseFrequency;
  if (condition === 'storm' || condition === 'extreme' || condition === 'super_extreme') {
    finalFrequency *= 1.2;
  }
  
  // Apply X-ray boost to frequency (brief filter opening)
  finalFrequency *= (1 + xrayBoost);
  
  return {
    frequency: clamp(ensureFinite(finalFrequency, 800), 20, 20000),
    q: clamp(ensureFinite(q, 1), 0.5, 20),
    shimmerGain: clamp(ensureFinite(shimmerGain, 0), 0, 0.5),
    xrayBoost: clamp(ensureFinite(xrayBoost, 0), 0, 0.15)
  };
}

// ============================================================================
// DECAY TIME: DENSITY
// ============================================================================

function calculateDecayTime(density: number): number {
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  const decayTime = 5.0 - (normalizedDensity * 4.8);
  
  return Math.max(0.2, Math.min(5.0, decayTime));
}

// ============================================================================
// CHORD VOICING: HARMONY BASED ON HARMONIC SERIES AND SPACE WEATHER
// ============================================================================

/**
 * Calculate chord voicing using harmonic series principles
 * Maps space weather parameters directly to chord qualities:
 * - Temperature → Major/minor quality (high temp = major, low temp = minor)
 * - Density → Harmonic richness (low = triad, high = extended chords)
 * - Bz → Extensions (southward = tensions, northward = simple)
 * - K-index → Voicing complexity
 */
function calculateChordVoicing(
  fundamentalFreq: number,
  fundamentalMidi: number,
  fundamentalNote: string,
  condition: SpaceWeatherCondition,
  density: number,
  temperature: number,
  bz: number,
  kp: number
): ChordTone[] {
  const chordTones: ChordTone[] = [
    {
      frequency: fundamentalFreq,
      midiNote: fundamentalMidi,
      noteName: fundamentalNote,
      amplitude: 1.0 // Fundamental is always loudest
    }
  ];

  // Normalize parameters
  const TEMPERATURE_THRESHOLD = 100000; // Kelvin - determines major/minor
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  
  // Determine chord quality from temperature
  const isMajor = temperature >= TEMPERATURE_THRESHOLD;
  
  // Determine harmonic richness from density
  // Low density (0.5-5) → triad, Medium (5-20) → 6th/7th, High (20-50) → 9th/extended
  const useTriad = normalizedDensity < 0.2;
  const useExtended = normalizedDensity > 0.6;
  
  // Determine extensions from Bz (southward = tensions)
  const useExtensions = bz < -5 && !useTriad;
  
  // Build chord from harmonic series
  // Harmonic series: f, 2f (octave), 3f (fifth), 4f (octave), 5f (major third), 6f (fifth), 7f (minor 7th), 9f (major 9th)
  
  if (condition === 'super_extreme') {
    // Super Extreme: Maximum dissonance for major events
    // Use major second and tritone for a jarring, intense sound
    chordTones.push(
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 2, 0.35), // Major 2nd
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 6, 0.3)  // Tritone
    );
    // Add a high, piercing minor 9th if density is high
    if (normalizedDensity > 0.5) {
      chordTones.push(
        createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 13, 0.2) // Minor 9th
      );
    }
  } else if (condition === 'extreme') {
    // Extreme: Dissonant intervals from non-harmonic partials
    // Use tritone and minor second for maximum tension
    chordTones.push(
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 1, 0.3), // Minor 2nd
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 6, 0.25)  // Tritone
    );
    // Keep perfect fifth for some stability
    if (normalizedDensity > 0.3) {
      chordTones.push(
        createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 7, 0.2) // Perfect 5th
      );
    }
  } else if (isMajor) {
    // Major chords from harmonic series
    // Major triad: Root (1f), Major 3rd (5f → 4 semitones), Perfect 5th (3f → 7 semitones)
    chordTones.push(
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 4, 0.4), // Major 3rd
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 7, 0.35) // Perfect 5th
    );
    
    // Add extensions based on density and Bz
    if (useExtended || useExtensions) {
      // Major 6th (9 semitones) or Major 9th (14 semitones)
      if (normalizedDensity > 0.7) {
        chordTones.push(
          createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 14, 0.25) // Major 9th
        );
      } else {
        chordTones.push(
          createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 9, 0.25) // Major 6th
        );
      }
    }
  } else {
    // Minor chords - adjust major third down by semitone
    // Minor triad: Root (1f), Minor 3rd (3 semitones), Perfect 5th (7 semitones)
    chordTones.push(
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 3, 0.4), // Minor 3rd
      createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 7, 0.35) // Perfect 5th
    );
    
    // Add extensions for minor chords
    if (useExtended || useExtensions) {
      // Minor 6th (8 semitones) or Minor 7th (10 semitones)
      if (normalizedDensity > 0.7 && bz < -10) {
        chordTones.push(
          createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 10, 0.25) // Minor 7th
        );
      } else if (normalizedDensity > 0.5) {
        chordTones.push(
          createChordToneFromInterval(fundamentalFreq, fundamentalMidi, fundamentalNote, 8, 0.25) // Minor 6th
        );
      }
    }
  }
  
  // Normalize octaves - keep all notes within 2 octaves of root
  return normalizeChordOctaves(chordTones, fundamentalMidi);
}

/**
 * Get proper enharmonic spelling for chord tones
 * Returns correct note name (Eb vs D#, etc.) based on root and interval
 * For proper chord spelling: minor intervals use flats, major intervals use sharps/naturals
 */
function getProperChordNoteName(rootNote: string, intervalSemitones: number, midiNote: number): string {
  const octave = Math.floor((midiNote - 12) / 12);
  const noteNameIndex = (midiNote - 12) % 12;
  
  // Standard sharp-based note names
  const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // For proper chord spelling, convert sharps to flats for minor intervals
  // Minor 3rd (3 semitones): D# → Eb, G# → Ab, A# → Bb
  // Minor 6th (8 semitones): G# → Ab, A# → Bb  
  // Minor 7th (10 semitones): A# → Bb
  
  if (intervalSemitones === 3) {
    // Minor 3rd: prefer flats
    if (noteNameIndex === 3) return `Eb${octave}`; // D# → Eb
    if (noteNameIndex === 8) return `Ab${octave}`; // G# → Ab
    if (noteNameIndex === 10) return `Bb${octave}`; // A# → Bb
  }
  
  if (intervalSemitones === 8) {
    // Minor 6th: prefer flats
    if (noteNameIndex === 8) return `Ab${octave}`; // G# → Ab
    if (noteNameIndex === 10) return `Bb${octave}`; // A# → Bb
  }
  
  if (intervalSemitones === 10) {
    // Minor 7th: prefer flats
    if (noteNameIndex === 10) return `Bb${octave}`; // A# → Bb
  }
  
  // Default: use standard sharp-based naming
  return `${sharpNames[noteNameIndex]}${octave}`;
}

/**
 * Create a chord tone from an interval in semitones
 */
function createChordToneFromInterval(
  fundamentalFreq: number,
  fundamentalMidi: number,
  fundamentalNote: string,
  intervalSemitones: number,
  amplitude: number
): ChordTone {
  const midiNote = fundamentalMidi + intervalSemitones;
  const frequency = midiNoteToFrequency(midiNote);
  
  // Get proper chord spelling (Eb instead of D# for minor 3rd, etc.)
  const noteName = getProperChordNoteName(fundamentalNote, intervalSemitones, midiNote);
  
  return {
    frequency,
    midiNote,
    noteName,
    amplitude: Math.max(0.1, Math.min(1.0, amplitude))
  };
}

/**
 * Normalize chord voicing to keep notes within reasonable octave range
 * Prevents chords from spanning too many octaves
 */
function normalizeChordOctaves(chordTones: ChordTone[], rootMidi: number): ChordTone[] {
  const rootOctave = Math.floor((rootMidi - 12) / 12);
  const maxOctaveSpan = 2; // Keep within 2 octaves
  
  return chordTones.map(tone => {
    const toneOctave = Math.floor((tone.midiNote - 12) / 12);
    const octaveDiff = toneOctave - rootOctave;
    
    // If note is more than maxOctaveSpan octaves away, bring it closer
    if (Math.abs(octaveDiff) > maxOctaveSpan) {
      const adjustment = octaveDiff > 0 ? -12 * (octaveDiff - maxOctaveSpan) : 12 * (Math.abs(octaveDiff) - maxOctaveSpan);
      const newMidiNote = tone.midiNote + adjustment;
      const newFreq = midiNoteToFrequency(newMidiNote);
      
      // Get note name using proper spelling
      const rootNote = chordTones[0]?.noteName || 'C4';
      const intervalFromRoot = newMidiNote - rootMidi;
      const newNoteName = getProperChordNoteName(rootNote, intervalFromRoot, newMidiNote);
      
      return {
        ...tone,
        midiNote: newMidiNote,
        frequency: newFreq,
        noteName: newNoteName
      };
    }
    
    return tone;
  });
}


// ============================================================================
// REVERB & DELAY: ATMOSPHERIC EFFECTS
// ============================================================================

interface ReverbDelayData {
  reverbRoomSize: number;
  delayTime: number;
  delayFeedback: number;
  delayGain: number;
}

/**
 * Calculate reverb and delay parameters based on density, temperature, proton flux, and dynamic pressure
 */
function calculateReverbDelay(
  density: number,
  temperature: number,
  condition: SpaceWeatherCondition,
  protonFlux?: ComprehensiveSpaceWeatherData['proton_flux'],
  dynamicPressure?: number,
  previousDynamicPressure?: number
): ReverbDelayData {
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  const PROTON_LOG_RANGE = { min: 0, max: 5 };
  
  // Density → reverb size (high density = smaller room, low = cathedral)
  const normalizedDensity = normalizeLinear(ensureFinite(density, DENSITY_RANGE.min), DENSITY_RANGE.min, DENSITY_RANGE.max);
  // Invert: low density = large room (high reverb), high density = small room (low reverb)
  let reverbRoomSize = 0.2 + ((1 - normalizedDensity) * 0.6); // 0.2 (small) to 0.8 (large)
  
  // Proton flux → increase reverb density during radiation storms (dense "air")
  if (protonFlux?.flux_10mev !== undefined && Number.isFinite(protonFlux.flux_10mev)) {
    const normalizedProton = normalizeLog10(protonFlux.flux_10mev, PROTON_LOG_RANGE.min, PROTON_LOG_RANGE.max);
    // Higher proton flux → denser reverb (longer tail)
    reverbRoomSize = Math.min(1.0, reverbRoomSize + normalizedProton * 0.3);
  }
  
  // Temperature → delay feedback (high temp = more echoes)
  const normalizedTemp = normalizeLinear(ensureFinite(temperature, TEMPERATURE_RANGE.min), TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max);
  let delayFeedback = normalizedTemp * 0.4; // 0 to 0.4 feedback
  
  // Dynamic pressure → modulate delay feedback (Pdyn shocks reset feedback briefly)
  if (dynamicPressure !== undefined && Number.isFinite(dynamicPressure)) {
    const PDYN_RANGE = { min: 0.5, max: 20 }; // nPa typical range
    const normalizedPdyn = normalizeLinear(dynamicPressure, PDYN_RANGE.min, PDYN_RANGE.max);
    // High Pdyn → reduce delay feedback (transient "kick" effect)
    delayFeedback *= (1 - normalizedPdyn * 0.5);
    
    // Detect Pdyn shocks (sudden increases) - compare with previousPdyn
    if (
      previousDynamicPressure !== undefined &&
      Number.isFinite(previousDynamicPressure) &&
      previousDynamicPressure > 0
    ) {
      const shockRatio = dynamicPressure / previousDynamicPressure;
      // If pressure increased by more than 1.5x, it's a shock
      if (Number.isFinite(shockRatio) && shockRatio > 1.5) {
        // Reset delay feedback briefly (percussive kick effect)
        const shockIntensity = Math.min(1, (shockRatio - 1.5) / 2); // Normalize shock intensity
        delayFeedback *= (1 - shockIntensity * 0.7); // Reduce feedback more during shocks
      }
    }
  }
  
  // Delay time: base on condition
  let delayTime: number;
  switch (condition) {
    case 'quiet':
      delayTime = 0.15; // Short delay
      break;
    case 'moderate':
      delayTime = 0.25;
      break;
    case 'storm':
      delayTime = 0.35;
      break;
    case 'extreme':
      delayTime = 0.5; // Longer delay for dramatic effect
      break;
    case 'super_extreme':
      delayTime = 0.75; // Even longer for super extreme
      break;
    default:
      delayTime = 0.2; // A safe default
      break;
  }
  
  // Delay gain: subtle (20-30% wet/dry mix)
  const delayGain = condition === 'super_extreme'
    ? 0.35
    : condition === 'extreme'
      ? 0.3
      : condition === 'storm'
        ? 0.25
        : 0.2;
  
  return {
    reverbRoomSize: clamp(ensureFinite(reverbRoomSize, 0.3), 0.1, 1.0),
    delayTime: clamp(ensureFinite(delayTime, 0.2), 0.1, 1.0),
    delayFeedback: clamp(ensureFinite(delayFeedback, 0.1), 0, 0.5),
    delayGain: clamp(ensureFinite(delayGain, 0.2), 0.1, 0.4)
  };
}

// ============================================================================
// RUMBLE GAIN CALCULATION: PROTON FLUX
// ============================================================================

function calculateRumbleGain(
  condition: SpaceWeatherCondition,
  protonFlux?: ComprehensiveSpaceWeatherData['proton_flux']
): number {
  const PROTON_LOG_RANGE = { min: 0, max: 5 };

  // Base rumble gain from condition
  let rumbleGain;
  switch (condition) {
    case 'super_extreme':
      rumbleGain = 0.6;
      break;
    case 'extreme':
      rumbleGain = 0.4;
      break;
    case 'storm':
      rumbleGain = 0.2;
      break;
    default:
      rumbleGain = 0;
  }
  
  // Proton flux → drive sub-bass/rumble layer gain during radiation storms
  if (protonFlux?.flux_10mev !== undefined && Number.isFinite(protonFlux.flux_10mev)) {
    const normalizedProton = normalizeLog10(protonFlux.flux_10mev, PROTON_LOG_RANGE.min, PROTON_LOG_RANGE.max);
    // Higher proton flux → more rumble (sub-bass weight)
    rumbleGain = Math.max(rumbleGain, normalizedProton * 0.5);
  }
  
  return clamp(ensureFinite(rumbleGain, 0), 0, 0.8); // Allow up to 0.8 for super extreme proton storms
}

// ============================================================================
// BINAURAL LAYER: CALM, TIME-AWARE DRIFT
// ============================================================================

function calculateBinauralBeat(
  fundamentalHz: number,
  condition: SpaceWeatherCondition,
  kp: number,
  velocity: number,
  density: number,
  now: number
): { beatHz: number; baseHz: number; mix: number } {
  // Time-of-day drift (sinusoid over 24h)
  const minutes = Math.floor((now / 60000) % 1440);
  const circadian = 0.5 + 0.5 * Math.sin((minutes / 1440) * Math.PI * 2);
  
  // Beat rate: calmer midday/evening (~4-6 Hz), nudged higher during storms/fast wind
  const stormPush = kp >= 6 ? 2 : kp >= 4 ? 1 : 0;
  const windPush = velocity > 700 ? 0.5 : velocity > 550 ? 0.25 : 0;
  const densityDamping = density > 15 ? -0.5 : density > 8 ? -0.25 : 0;
  const beatHz = clamp(3 + circadian * 2 + stormPush + windPush + densityDamping, 2, 8.5);
  
  // Base carrier: keep in a mid range so it sits under the vowels
  const baseHz = clamp(fundamentalHz * 0.45, 90, 420);
  
  // Mix: subtle by default, grows a bit at night or during calm conditions
  let mix = 0.06 + circadian * 0.08;
  if (condition === 'quiet' || condition === 'moderate') {
    mix += 0.04;
  }
  if (kp >= 6) {
    mix += 0.02; // keep present during storms so the beat stays perceptible
  }
  
  return {
    beatHz,
    baseHz,
    mix: clamp(mix, 0.05, 0.2)
  };
}

// ============================================================================
// MISSING DATA HANDLING
// ============================================================================

export function createDefaultHeliosingerMapping(): HeliosingerData {
  const defaultVowel = VOWEL_FORMANTS['A'];
  
  return {
    baseNote: 'C2',
    frequency: 65.41,
    midiNote: 36,
    decayTime: 3.0,
    detuneCents: 0,
    condition: 'quiet',
    density: 5,
    velocity: 350,
    bz: 0,
    kIndex: 1,
    currentVowel: defaultVowel,
    vowelName: 'A',
    vowelDescription: defaultVowel.description,
    solarMood: 'The sun breathes a calm, open tone',
    chordQuality: getChordQuality('quiet', [{
      frequency: 65.41,
      midiNote: 36,
      noteName: 'C2',
      amplitude: 1.0
    }]),
    formantFilters: getFormantFiltersForVowel(defaultVowel, 65.41),
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
    rumbleGain: 0,
    chordVoicing: [{
      frequency: 65.41,
      midiNote: 36,
      noteName: 'C2',
      amplitude: 1.0
    }],
    reverbRoomSize: 0.3,
    delayTime: 0.15,
    delayFeedback: 0.1,
    delayGain: 0.2,
    binauralBeatHz: 0,
    binauralBaseHz: 65.41,
    binauralMix: 0,
    tailMetrics: {
      bLobe: 25,
      eTail: 3_600_000_000_000, // ~3.6e12 J for a quiet-time lobe estimate
      jCross: 0.2,
      dSheet: 5,
      stretchingIndex: 0,
      stretchingProgress: 0,
      phase: SubstormPhase.QUIET,
      phaseElapsedMs: 0,
    },
  };
}
