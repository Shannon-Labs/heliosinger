/**
 * Heliosinger: The Sun Sings Space Weather
 * 
 * Enhanced mapping framework that makes the sun literally sing
 * by mapping space weather parameters to vowel sounds and musical parameters
 */

import type { ComprehensiveSpaceWeatherData, ChordData, SpaceWeatherCondition } from "@shared/schema";
import { midiNoteToFrequency } from "./midi-mapping";
import { 
  VOWEL_FORMANTS, 
  VowelName, 
  VowelFormants,
  getVowelFromSpaceWeather,
  getSolarMoodDescription,
  getFormantFiltersForVowel
} from "./vowel-filters";
import { getChordQuality, type ChordQuality } from "./chord-utils";

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
}

// ============================================================================
// MAIN HELIOSINGER MAPPING FUNCTION
// ============================================================================

// Module-level state for tracking previous values (for spike detection)
let previousData: ComprehensiveSpaceWeatherData | null = null;
let previousDerivedMetrics: DerivedMetrics | null = null;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function mapSpaceWeatherToHeliosinger(
  data: ComprehensiveSpaceWeatherData
): HeliosingerData {
  const solarWind = data.solar_wind;
  const kIndex = data.k_index;
  
  if (!solarWind) {
    throw new Error("Solar wind data is required for Heliosinger mapping");
  }

  // Step 1: Calculate foundation (velocity → pitch) - same as before
  const { frequency, midiNote, noteName } = calculateFoundationFrequency(solarWind.velocity);
  
  // Step 2: Determine space weather condition
  const condition = determineSpaceWeatherCondition(solarWind, kIndex);
  
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
    solarWind.velocity
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
    previousData?.magnetometer
  );
  
  // Step 9: Calculate filter and texture parameters (temperature + BT + flux data + plasma beta)
  const filterData = calculateFilterParameters(
    solarWind.temperature, 
    solarWind.bt || derivedMetrics.totalField, 
    condition,
    data.xray_flux,
    data.electron_flux,
    derivedMetrics.plasmaBeta,
    previousData?.xray_flux
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
    previousDerivedMetrics?.dynamicPressure
  );
  
  // Step 13: Calculate rumble gain from proton flux
  const rumbleGain = calculateRumbleGain(condition, data.proton_flux);

  // Step 14: Calming binaural beat layer (time + condition aware)
  const binauralData = calculateBinauralBeat(
    frequency,
    condition,
    kIndex?.kp || 0,
    solarWind.velocity,
    solarWind.density
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
    kIndex: kIndex?.kp || 0,
    
    // Heliosinger vowel singing fields
    currentVowel,
    vowelName: currentVowel.name,
    vowelDescription: currentVowel.description,
    solarMood: getSolarMoodDescription(currentVowel, condition),
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
    filterFrequency: filterData.frequency,
    filterQ: filterData.q,
    
    // Texture parameters
    shimmerGain: filterData.shimmerGain,
    rumbleGain: rumbleGain,
    
    // Chord voicing
    chordVoicing,
    
    // Reverb and delay
    reverbRoomSize: reverbDelayData.reverbRoomSize,
    delayTime: reverbDelayData.delayTime,
    delayFeedback: reverbDelayData.delayFeedback,
    delayGain: reverbDelayData.delayGain,

    // Binaural layer
    binauralBeatHz: binauralData.beatHz,
    binauralBaseHz: binauralData.baseHz,
    binauralMix: binauralData.mix
  };
  
  // Store current data for next call (for spike detection)
  previousData = data;
  previousDerivedMetrics = derivedMetrics;
  
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
    amplitude *= tiltFactor;
    
    // Normalize so fundamental is 1.0
    if (i === 0) {
      amplitude = 1.0;
    } else {
      amplitude /= tiltFactor;
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
  // Dynamic pressure: Pdyn = 1.6726e-6 * n * v² (nPa)
  const dynamicPressure = 1.6726e-6 * density * velocity * velocity;
  
  // Total magnetic field: BT = sqrt(Bx² + By² + Bz²)
  const totalField = Math.sqrt(bx * bx + by * by + bz * bz);
  
  // IMF clock angle: θc = atan2(By, Bz)
  const clockAngle = Math.atan2(by, bz);
  
  // Interplanetary electric field: Ey = -Vsw * Bz (mV/m, GSM)
  const electricField = -velocity * bz * 1e-3; // Convert to mV/m
  
  // Alfvén speed: Va = 21.8 * BT / sqrt(n) (km/s)
  // where BT is in nT and n is in cm⁻³
  const alfvenSpeed = density > 0 ? 21.8 * totalField / Math.sqrt(density) : 0;
  
  // Alfvén Mach number: MA = Vsw / Va
  const machNumber = alfvenSpeed > 0 ? velocity / alfvenSpeed : 0;
  
  // Plasma beta approximation: β ∝ n * T / BT²
  // Using simplified formula: β ≈ 4.03e-6 * n * T / BT²
  // where n is in cm⁻³, T is in K, BT is in nT
  const plasmaBeta = totalField > 0 
    ? 4.03e-6 * density * temperature / (totalField * totalField)
    : 0;
  
  return {
    dynamicPressure,
    clockAngle,
    totalField,
    electricField,
    alfvenSpeed,
    machNumber,
    plasmaBeta
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
  
  const normalizedBz = Math.max(0, Math.min(1, (bz - B_FIELD_RANGE.min) / (B_FIELD_RANGE.max - B_FIELD_RANGE.min)));
  
  // Stereo spread: 0.1 (northward) to 1.0 (southward)
  let stereoSpread: number;
  if (bz > 0) {
    stereoSpread = 0.1 + (normalizedBz * 0.2);
  } else {
    stereoSpread = 0.5 + ((1 - normalizedBz) * 0.5);
  }
  
  // Clock angle → slow auto-pan sweep; speed proportional to |By|
  if (clockAngle !== undefined) {
    // Map clock angle (0 to 2π) to stereo pan position (-1 to 1)
    const panPosition = Math.sin(clockAngle);
    // Speed of rotation proportional to |By|
    const byMagnitude = Math.abs(by);
    const rotationSpeed = Math.min(1, byMagnitude / 10); // Normalize to 0-1
    // Apply clock angle influence to stereo spread
    stereoSpread = 0.5 + panPosition * 0.3 * rotationSpeed;
  }
  
  // Bx: Left-right balance
  const normalizedBx = Math.max(0, Math.min(1, (bx - B_FIELD_RANGE.min) / (B_FIELD_RANGE.max - B_FIELD_RANGE.min)));
  const balanceOffset = (normalizedBx - 0.5) * 0.6;
  
  const leftGain = Math.max(0.1, 0.5 - (stereoSpread / 2) + balanceOffset);
  const rightGain = Math.max(0.1, 0.5 - (stereoSpread / 2) - balanceOffset);
  
  // Bz detuning and vibrato
  let detuneCents = bz < -5 ? (bz * 2) : 0;
  let vibratoDepth = bz < 0 ? Math.min(50, Math.abs(bz) * 2) : Math.abs(bz) * 0.5;
  let vibratoRate = Math.max(1, Math.min(10, Math.abs(bz) * 0.3));
  
  // Total field BT → bias brightness/harmonics (affects vibrato depth)
  if (totalField !== undefined) {
    const BT_RANGE = { min: 0, max: 20 };
    const normalizedBT = Math.max(0, Math.min(1, (totalField - BT_RANGE.min) / (BT_RANGE.max - BT_RANGE.min)));
    // Higher BT → more vibrato depth
    vibratoDepth *= (1 + normalizedBT * 0.5);
  }
  
  // Mach number → scale vibrato/tremolo depth
  if (machNumber !== undefined) {
    const MA_RANGE = { min: 0, max: 10 };
    const normalizedMA = Math.max(0, Math.min(1, machNumber / MA_RANGE.max));
    // Super-Alfvénic → more energetic texture
    vibratoDepth *= (1 + normalizedMA * 0.3);
    vibratoRate *= (1 + normalizedMA * 0.2);
  }
  
  // Electric field Ey → modulation intensity
  if (electricField !== undefined) {
    const EY_RANGE = { min: -5, max: 5 }; // mV/m typical range
    const normalizedEy = Math.max(0, Math.min(1, Math.abs(electricField) / Math.abs(EY_RANGE.max)));
    // Higher Ey → more agitation (faster vibrato)
    vibratoRate *= (1 + normalizedEy * 0.4);
  }
  
  return {
    stereoSpread: Math.max(0.1, Math.min(1.0, stereoSpread)),
    leftGain,
    rightGain,
    detuneCents: Math.round(detuneCents),
    vibratoDepth: Math.round(Math.max(0, Math.min(100, vibratoDepth))),
    vibratoRate: Math.round(Math.max(0.1, Math.min(15, vibratoRate)) * 10) / 10
  };
}

// ============================================================================
// RHYTHMIC LAYER: K-INDEX + MAGNETOMETER
// ============================================================================

interface RhythmicData {
  rate: number;
  depth: number;
  waveform: OscillatorType;
}

function calculateRhythmicParameters(
  kp: number, 
  condition: SpaceWeatherCondition,
  magnetometer?: ComprehensiveSpaceWeatherData['magnetometer'],
  previousMagnetometer?: ComprehensiveSpaceWeatherData['magnetometer']
): RhythmicData {
  const K_INDEX_RANGE = { min: 0, max: 9 };
  
  const normalizedKp = Math.max(0, Math.min(1, (kp - K_INDEX_RANGE.min) / (K_INDEX_RANGE.max - K_INDEX_RANGE.min)));
  
  let rate = 0.5 + (normalizedKp * 7.5);
  let depth = 0.1 + (normalizedKp * 0.7);
  
  // Magnetometer H component → slow pulses and occasional LF "thuds"
  if (magnetometer?.h_component !== undefined) {
    const H_RANGE = { min: -200, max: 200 }; // nT typical range for Boulder H
    const normalizedH = Math.max(0, Math.min(1,
      (Math.abs(magnetometer.h_component) - Math.abs(H_RANGE.min)) / (Math.abs(H_RANGE.max) - Math.abs(H_RANGE.min))
    ));
    
    // Calculate dH/dt (rate of change) for sharp changes
    let dHdt = 0;
    if (previousMagnetometer?.h_component !== undefined) {
      dHdt = Math.abs(magnetometer.h_component - previousMagnetometer.h_component);
      const DH_RANGE = { min: 0, max: 50 }; // nT change per update
      const normalizedDH = Math.max(0, Math.min(1, dHdt / DH_RANGE.max));
      
      // Sharp changes → increase tremolo depth (LF "thuds")
      depth = Math.max(depth, normalizedDH * 0.8);
      
      // Large H magnitude → slower pulses
      if (normalizedH > 0.5) {
        rate *= (1 - normalizedH * 0.4); // Slow down pulses
      }
    }
  }
  
  let waveform: OscillatorType;
  if (kp < 3) {
    waveform = 'sine';
  } else if (kp < 5) {
    waveform = 'triangle';
  } else if (kp < 7) {
    waveform = 'square';
  } else {
    waveform = 'sawtooth';
  }
  
  return { rate, depth, waveform };
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
  
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - TEMPERATURE_RANGE.min) / (TEMPERATURE_RANGE.max - TEMPERATURE_RANGE.min)));
  let baseFrequency = 200 + (normalizedTemp * 1800);
  
  const normalizedBt = Math.max(0, Math.min(1, (bt - BT_RANGE.min) / (BT_RANGE.max - BT_RANGE.min)));
  let q = 1 + (normalizedBt * 7);
  
  // Base shimmer gain from temperature
  let shimmerGain = normalizedTemp > 0.7 ? (normalizedTemp - 0.7) * 0.3 : 0;
  
  // Enhance shimmer gain from electron flux (high-frequency shimmer/air)
  if (electronFlux?.flux_2mev !== undefined) {
    const ELECTRON_FLUX_RANGE = { min: 1e3, max: 1e6 }; // Typical range for 2MeV electrons
    const normalizedElectron = Math.max(0, Math.min(1, 
      (electronFlux.flux_2mev - ELECTRON_FLUX_RANGE.min) / (ELECTRON_FLUX_RANGE.max - ELECTRON_FLUX_RANGE.min)
    ));
    shimmerGain = Math.max(shimmerGain, normalizedElectron * 0.4);
  }
  
  // X-ray flux spikes → brief brightness boost and filter opening
  let xrayBoost = 0;
  if (xrayFlux?.short_wave !== undefined) {
    const XRAY_FLUX_RANGE = { min: 1e-8, max: 1e-3 }; // W/m² typical range
    const normalizedXray = Math.max(0, Math.min(1,
      (xrayFlux.short_wave - XRAY_FLUX_RANGE.min) / (XRAY_FLUX_RANGE.max - XRAY_FLUX_RANGE.min)
    ));
    // Detect spikes (values above 70% of range indicate flares)
    if (normalizedXray > 0.7) {
      xrayBoost = (normalizedXray - 0.7) * 0.3; // 0 to 0.09 boost
    }
    
    // Detect transient spikes (sudden increases) - compare with previous value
    if (previousXrayFlux?.short_wave !== undefined && previousXrayFlux.short_wave > 0) {
      const spikeRatio = xrayFlux.short_wave / previousXrayFlux.short_wave;
      // If flux increased by more than 2x, it's a spike
      if (spikeRatio > 2.0) {
        // Additional boost for transient spike (0.1-0.2s tempo bump effect)
        const spikeIntensity = Math.min(1, (spikeRatio - 2.0) / 10); // Normalize spike intensity
        xrayBoost = Math.max(xrayBoost, spikeIntensity * 0.15); // Additional 0-0.15 boost
      }
    }
  }
  
  // Plasma beta affects filter brightness and tilt
  if (plasmaBeta !== undefined) {
    const normalizedBeta = Math.max(0, Math.min(1, Math.log10(Math.max(0.01, plasmaBeta)) / 3)); // Log scale 0.01 to 1000
    // High beta → brighter filter (higher frequency)
    baseFrequency *= (1 + normalizedBeta * 0.2);
    // High beta → more open filter (lower Q)
    q *= (1 - normalizedBeta * 0.3);
  }
  
  let finalFrequency = baseFrequency;
  if (condition === 'storm' || condition === 'extreme') {
    finalFrequency *= 1.2;
  }
  
  // Apply X-ray boost to frequency (brief filter opening)
  finalFrequency *= (1 + xrayBoost);
  
  return {
    frequency: Math.min(20000, finalFrequency),
    q: Math.max(0.5, Math.min(20, q)),
    shimmerGain: Math.min(0.5, shimmerGain),
    xrayBoost
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
  
  // Density → reverb size (high density = smaller room, low = cathedral)
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  // Invert: low density = large room (high reverb), high density = small room (low reverb)
  let reverbRoomSize = 0.2 + ((1 - normalizedDensity) * 0.6); // 0.2 (small) to 0.8 (large)
  
  // Proton flux → increase reverb density during radiation storms (dense "air")
  if (protonFlux?.flux_10mev !== undefined) {
    const PROTON_FLUX_RANGE = { min: 1, max: 1e5 }; // Typical range for 10MeV protons (pfu)
    const normalizedProton = Math.max(0, Math.min(1,
      (protonFlux.flux_10mev - PROTON_FLUX_RANGE.min) / (PROTON_FLUX_RANGE.max - PROTON_FLUX_RANGE.min)
    ));
    // Higher proton flux → denser reverb (longer tail)
    reverbRoomSize = Math.min(1.0, reverbRoomSize + normalizedProton * 0.3);
  }
  
  // Temperature → delay feedback (high temp = more echoes)
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - TEMPERATURE_RANGE.min) / (TEMPERATURE_RANGE.max - TEMPERATURE_RANGE.min)));
  let delayFeedback = normalizedTemp * 0.4; // 0 to 0.4 feedback
  
  // Dynamic pressure → modulate delay feedback (Pdyn shocks reset feedback briefly)
  if (dynamicPressure !== undefined) {
    const PDYN_RANGE = { min: 0.5, max: 20 }; // nPa typical range
    const normalizedPdyn = Math.max(0, Math.min(1,
      (dynamicPressure - PDYN_RANGE.min) / (PDYN_RANGE.max - PDYN_RANGE.min)
    ));
    // High Pdyn → reduce delay feedback (transient "kick" effect)
    delayFeedback *= (1 - normalizedPdyn * 0.5);
    
    // Detect Pdyn shocks (sudden increases) - compare with previousPdyn
    if (previousDynamicPressure !== undefined && previousDynamicPressure > 0) {
      const shockRatio = dynamicPressure / previousDynamicPressure;
      // If pressure increased by more than 1.5x, it's a shock
      if (shockRatio > 1.5) {
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
  const delayGain = condition === 'extreme' ? 0.3 : condition === 'storm' ? 0.25 : 0.2;
  
  return {
    reverbRoomSize: Math.max(0.1, Math.min(1.0, reverbRoomSize)),
    delayTime: Math.max(0.1, Math.min(1.0, delayTime)),
    delayFeedback: Math.max(0, Math.min(0.5, delayFeedback)),
    delayGain: Math.max(0.1, Math.min(0.4, delayGain))
  };
}

// ============================================================================
// RUMBLE GAIN CALCULATION: PROTON FLUX
// ============================================================================

function calculateRumbleGain(
  condition: SpaceWeatherCondition,
  protonFlux?: ComprehensiveSpaceWeatherData['proton_flux']
): number {
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
  if (protonFlux?.flux_10mev !== undefined) {
    const PROTON_FLUX_RANGE = { min: 1, max: 1e5 }; // Typical range for 10MeV protons (pfu)
    const normalizedProton = Math.max(0, Math.min(1,
      (protonFlux.flux_10mev - PROTON_FLUX_RANGE.min) / (PROTON_FLUX_RANGE.max - PROTON_FLUX_RANGE.min)
    ));
    // Higher proton flux → more rumble (sub-bass weight)
    rumbleGain = Math.max(rumbleGain, normalizedProton * 0.5);
  }
  
  return Math.min(0.8, rumbleGain); // Allow up to 0.8 for super extreme proton storms
}

// ============================================================================
// BINAURAL LAYER: CALM, TIME-AWARE DRIFT
// ============================================================================

function calculateBinauralBeat(
  fundamentalHz: number,
  condition: SpaceWeatherCondition,
  kp: number,
  velocity: number,
  density: number
): { beatHz: number; baseHz: number; mix: number } {
  // Time-of-day drift (sinusoid over 24h)
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
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
// CONDITION DETERMINATION
// ============================================================================

function determineSpaceWeatherCondition(
  solarWind: NonNullable<ComprehensiveSpaceWeatherData['solar_wind']>,
  kIndex: ComprehensiveSpaceWeatherData['k_index']
): SpaceWeatherCondition {
  const kp = kIndex?.kp || 0;
  const velocity = solarWind.velocity;
  const bz = solarWind.bz;

  if (kp >= 8) {
    return 'super_extreme';
  }
  
  if (kp >= 7 || (kp >= 5 && bz < -15)) {
    return 'extreme';
  }
  
  if (kp >= 5 || bz < -10 || velocity > 600) {
    return 'storm';
  }
  
  if (kp >= 3 || (Math.abs(bz) > 5 && velocity > 450)) {
    return 'moderate';
  }
  
  return 'quiet';
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
    binauralMix: 0
  };
}
