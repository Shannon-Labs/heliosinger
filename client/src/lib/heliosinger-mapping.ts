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
}

// ============================================================================
// MAIN HELIOSINGER MAPPING FUNCTION
// ============================================================================

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
  
  // Step 3: Get the vowel the sun is singing based on parameters
  const currentVowel = getVowelFromSpaceWeather(
    solarWind.density,
    solarWind.temperature,
    solarWind.bz,
    kIndex?.kp || 0
  );
  
  // Step 4: Calculate formant filters for the vowel
  const formantFilters = getFormantFiltersForVowel(currentVowel, frequency);
  
  // Step 5: Calculate harmonic content (density + temperature)
  const harmonicData = calculateHarmonicContent(solarWind.density, solarWind.temperature, condition);
  
  // Step 6: Calculate spatial parameters (IMF vector)
  const spatialData = calculateSpatialParameters(solarWind.bz, solarWind.bx || 0, solarWind.by || 0);
  
  // Step 7: Calculate rhythmic parameters (K-index)
  const rhythmicData = calculateRhythmicParameters(kIndex?.kp || 0, condition);
  
  // Step 8: Calculate filter and texture parameters
  const filterData = calculateFilterParameters(solarWind.temperature, solarWind.bt || 5, condition);
  
  // Step 9: Calculate decay time from density
  const decayTime = calculateDecayTime(solarWind.density);
  
  // Step 10: Calculate chord voicing (harmony) - using harmonic series and space weather parameters
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
  
  // Step 11: Calculate reverb and delay parameters
  const reverbDelayData = calculateReverbDelay(solarWind.density, solarWind.temperature, condition);
  
  // Step 12: Combine all parameters into Heliosinger data
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
    rumbleGain: condition === 'extreme' ? 0.4 : condition === 'storm' ? 0.2 : 0,
    
    // Chord voicing
    chordVoicing,
    
    // Reverb and delay
    reverbRoomSize: reverbDelayData.reverbRoomSize,
    delayTime: reverbDelayData.delayTime,
    delayFeedback: reverbDelayData.delayFeedback,
    delayGain: reverbDelayData.delayGain
  };
  
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
  condition: SpaceWeatherCondition
): HarmonicData {
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  
  // Density controls number of harmonics (1-8)
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  const harmonicCount = 1 + Math.floor(normalizedDensity * 7);
  
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
// SPATIAL LAYER: IMF VECTOR
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
  const B_FIELD_RANGE = { min: -20, max: 20 };
  
  const normalizedBz = Math.max(0, Math.min(1, (bz - B_FIELD_RANGE.min) / (B_FIELD_RANGE.max - B_FIELD_RANGE.min)));
  
  // Stereo spread: 0.1 (northward) to 1.0 (southward)
  let stereoSpread: number;
  if (bz > 0) {
    stereoSpread = 0.1 + (normalizedBz * 0.2);
  } else {
    stereoSpread = 0.5 + ((1 - normalizedBz) * 0.5);
  }
  
  // Bx: Left-right balance
  const normalizedBx = Math.max(0, Math.min(1, (bx - B_FIELD_RANGE.min) / (B_FIELD_RANGE.max - B_FIELD_RANGE.min)));
  const balanceOffset = (normalizedBx - 0.5) * 0.6;
  
  const leftGain = Math.max(0.1, 0.5 - (stereoSpread / 2) + balanceOffset);
  const rightGain = Math.max(0.1, 0.5 - (stereoSpread / 2) - balanceOffset);
  
  // Bz detuning and vibrato
  const detuneCents = bz < -5 ? (bz * 2) : 0;
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
  rate: number;
  depth: number;
  waveform: OscillatorType;
}

function calculateRhythmicParameters(kp: number, condition: SpaceWeatherCondition): RhythmicData {
  const K_INDEX_RANGE = { min: 0, max: 9 };
  
  const normalizedKp = Math.max(0, Math.min(1, (kp - K_INDEX_RANGE.min) / (K_INDEX_RANGE.max - K_INDEX_RANGE.min)));
  
  const rate = 0.5 + (normalizedKp * 7.5);
  const depth = 0.1 + (normalizedKp * 0.7);
  
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
// FILTER & TEXTURE: TEMPERATURE + BT
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
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  const BT_RANGE = { min: 0, max: 20 };
  
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - TEMPERATURE_RANGE.min) / (TEMPERATURE_RANGE.max - TEMPERATURE_RANGE.min)));
  const baseFrequency = 200 + (normalizedTemp * 1800);
  
  const normalizedBt = Math.max(0, Math.min(1, (bt - BT_RANGE.min) / (BT_RANGE.max - BT_RANGE.min)));
  const q = 1 + (normalizedBt * 7);
  
  const shimmerGain = normalizedTemp > 0.7 ? (normalizedTemp - 0.7) * 0.3 : 0;
  
  let finalFrequency = baseFrequency;
  if (condition === 'storm' || condition === 'extreme') {
    finalFrequency *= 1.2;
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
  
  if (condition === 'extreme') {
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
  
  // Get note name
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((midiNote - 12) / 12);
  const noteNameIndex = (midiNote - 12) % 12;
  const noteName = `${noteNames[noteNameIndex]}${octave}`;
  
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
      
      // Get note name
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const newOctave = Math.floor((newMidiNote - 12) / 12);
      const noteNameIndex = (newMidiNote - 12) % 12;
      const newNoteName = `${noteNames[noteNameIndex]}${newOctave}`;
      
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
 * Calculate reverb and delay parameters based on density and temperature
 */
function calculateReverbDelay(
  density: number,
  temperature: number,
  condition: SpaceWeatherCondition
): ReverbDelayData {
  const DENSITY_RANGE = { min: 0.5, max: 50.0 };
  const TEMPERATURE_RANGE = { min: 10000, max: 200000 };
  
  // Density → reverb size (high density = smaller room, low = cathedral)
  const normalizedDensity = Math.max(0, Math.min(1, (density - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)));
  // Invert: low density = large room (high reverb), high density = small room (low reverb)
  const reverbRoomSize = 0.2 + ((1 - normalizedDensity) * 0.6); // 0.2 (small) to 0.8 (large)
  
  // Temperature → delay feedback (high temp = more echoes)
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - TEMPERATURE_RANGE.min) / (TEMPERATURE_RANGE.max - TEMPERATURE_RANGE.min)));
  const delayFeedback = normalizedTemp * 0.4; // 0 to 0.4 feedback
  
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
// CONDITION DETERMINATION
// ============================================================================

function determineSpaceWeatherCondition(
  solarWind: NonNullable<ComprehensiveSpaceWeatherData['solar_wind']>,
  kIndex: ComprehensiveSpaceWeatherData['k_index']
): SpaceWeatherCondition {
  const kp = kIndex?.kp || 0;
  const velocity = solarWind.velocity;
  const bz = solarWind.bz;
  
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
    delayGain: 0.2
  };
}
