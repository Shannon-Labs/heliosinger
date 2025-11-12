/**
 * Musical Sound Effects Engine for Space Weather Events
 * 
 * Creates harmonious, musical sound effects that fit the Heliosinger aesthetic.
 * All sounds use musical intervals and pentatonic scales - no harsh alarms.
 */

import { midiNoteToFrequency, MUSICAL_INTERVALS, centsToFrequencyRatio } from './midi-mapping';

// Pentatonic scale intervals (in semitones from root)
const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9]; // C, D, E, G, A

// Rate limiting to prevent sound spam
const MIN_SOUND_INTERVAL = 2.0; // Minimum seconds between sounds
let lastSoundTime = 0;

// Lightweight AudioContext for sound effects (separate from Heliosinger)
let soundEffectsContext: AudioContext | null = null;

/**
 * Get or create the sound effects AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!soundEffectsContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    soundEffectsContext = new AudioContextClass();
    
    // Resume context if suspended (browser autoplay policy)
    if (soundEffectsContext.state === 'suspended') {
      soundEffectsContext.resume().catch(() => {
        console.warn('Could not resume sound effects AudioContext');
      });
    }
  }
  
  return soundEffectsContext;
}

/**
 * Check if enough time has passed since last sound
 */
function canPlaySoundNow(): boolean {
  const now = Date.now() / 1000; // Convert to seconds
  return (now - lastSoundTime) >= MIN_SOUND_INTERVAL;
}

/**
 * Record that a sound was played
 */
function recordSoundPlayed(): void {
  lastSoundTime = Date.now() / 1000;
}

/**
 * Create a musical tone with harmonics for richness
 */
function createMusicalTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  volume: number = 0.3,
  harmonics: number[] = [1, 2, 3] // Fundamental, octave, perfect fifth
): { oscillators: OscillatorNode[]; gain: GainNode } {
  const masterGain = context.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(context.destination);
  
  const oscillators: OscillatorNode[] = [];
  const harmonicAmplitudes = [1.0, 0.5, 0.25]; // Fundamental loudest
  
  harmonics.forEach((harmonic, index) => {
    const osc = context.createOscillator();
    const oscGain = context.createGain();
    
    osc.type = 'sine'; // Pure sine waves for musical tones
    osc.frequency.value = frequency * harmonic;
    
    // Set amplitude based on harmonic
    oscGain.gain.value = volume * (harmonicAmplitudes[index] || 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    
    oscillators.push(osc);
  });
  
  // Gentle attack and smooth decay
  const now = context.currentTime;
  const attackTime = 0.05;
  const decayTime = duration * 0.3;
  
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(volume, now + attackTime);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  return { oscillators, gain: masterGain };
}

/**
 * Play Kp threshold crossing sound
 * Musical ascending arpeggio using pentatonic scale
 */
export function playKpThresholdSound(threshold: number): void {
  if (!canPlaySoundNow()) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  recordSoundPlayed();
  
  // Map threshold to starting note in pentatonic scale
  // Threshold 3 = C4, 5 = E4, 7 = G4
  const baseMidiNote = 60 + (threshold === 3 ? 0 : threshold === 5 ? 4 : 7); // C4, E4, or G4
  const baseFreq = midiNoteToFrequency(baseMidiNote);
  
  // Create ascending arpeggio: root → major third → perfect fifth
  const intervals = [0, 4, 7]; // Root, major third, perfect fifth (major triad)
  const noteDuration = 0.3;
  const totalDuration = noteDuration * intervals.length;
  
  intervals.forEach((interval, index) => {
    const freq = baseFreq * centsToFrequencyRatio(interval * 100);
    const { oscillators } = createMusicalTone(
      context,
      freq,
      noteDuration * 1.5, // Slight overlap for smoothness
      0.25,
      [1, 2] // Fundamental + octave
    );
    
    const startTime = context.currentTime + (index * noteDuration);
    
    oscillators.forEach(osc => {
      osc.start(startTime);
      osc.stop(startTime + noteDuration * 1.5);
    });
  });
}

/**
 * Play condition change sound
 * Harmonic chord progression (major for improvements, minor for worsening)
 */
export function playConditionChangeSound(
  previousCondition: 'quiet' | 'moderate' | 'storm' | 'extreme' | 'super_extreme',
  currentCondition: 'quiet' | 'moderate' | 'storm' | 'extreme' | 'super_extreme'
): void {
  if (!canPlaySoundNow()) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  recordSoundPlayed();
  
  // Determine if condition improved or worsened
  const conditionLevels = {
    quiet: 0,
    moderate: 1,
    storm: 2,
    extreme: 3,
    super_extreme: 4
  };
  
  const previousLevel = conditionLevels[previousCondition];
  const currentLevel = conditionLevels[currentCondition];
  const isImproving = currentLevel < previousLevel;
  
  // Base frequency (C4 = 261.63 Hz)
  const baseFreq = 261.63;
  
  // Use major chord for improvements, minor chord for worsening
  const intervals = isImproving
    ? [0, 4, 7] // Major triad: C, E, G
    : [0, 3, 7]; // Minor triad: C, Eb, G
  
  const duration = 1.2;
  const volume = 0.3 + (currentLevel * 0.1); // Volume scales with severity
  
  // Play chord with smooth voice leading
  intervals.forEach((interval, index) => {
    const freq = baseFreq * centsToFrequencyRatio(interval * 100);
    const { oscillators } = createMusicalTone(
      context,
      freq,
      duration,
      volume * (index === 0 ? 1.0 : 0.6), // Root louder
      [1, 2] // Fundamental + octave
    );
    
    const startTime = context.currentTime + (index * 0.05); // Slight stagger
    
    oscillators.forEach(osc => {
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  });
}

/**
 * Play velocity spike sound
 * Musical chime-like tone using pentatonic intervals
 */
export function playVelocitySpikeSound(velocity: number, velocityChange: number): void {
  if (!canPlaySoundNow()) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  recordSoundPlayed();
  
  // Map velocity to musical note in pentatonic scale
  // Use velocity range 200-800 km/s mapped to C4-G5
  const normalizedVelocity = Math.max(0, Math.min(1, (velocity - 200) / 600));
  const pentatonicIndex = Math.floor(normalizedVelocity * 12); // 0-11
  const intervalIndex = pentatonicIndex % PENTATONIC_INTERVALS.length;
  const octaveOffset = Math.floor(pentatonicIndex / PENTATONIC_INTERVALS.length);
  
  const midiNote = 60 + (octaveOffset * 12) + PENTATONIC_INTERVALS[intervalIndex];
  const frequency = midiNoteToFrequency(midiNote);
  
  // Volume based on velocity change magnitude
  const volume = Math.min(0.4, 0.2 + (Math.abs(velocityChange) / 500) * 0.2);
  const duration = 0.5;
  
  // Create chime-like tone with harmonics
  const { oscillators } = createMusicalTone(
    context,
    frequency,
    duration,
    volume,
    [1, 2, 3] // Fundamental, octave, perfect fifth
  );
  
  const startTime = context.currentTime;
  
  oscillators.forEach(osc => {
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

/**
 * Play strong Bz event sound
 * Low musical tone with minor third or perfect fifth interval
 */
export function playBzEventSound(bz: number): void {
  if (!canPlaySoundNow()) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  recordSoundPlayed();
  
  // Low musical tone (C3 = 130.81 Hz)
  const baseFreq = 130.81;
  
  // Use minor third interval for musicality (C + Eb)
  const interval = MUSICAL_INTERVALS.minorThird;
  const secondFreq = baseFreq * centsToFrequencyRatio(interval);
  
  const duration = 1.2;
  const volume = 0.25;
  
  // Play two tones with slight delay for harmonic effect
  const frequencies = [baseFreq, secondFreq];
  
  frequencies.forEach((freq, index) => {
    const { oscillators } = createMusicalTone(
      context,
      freq,
      duration,
      volume * (index === 0 ? 1.0 : 0.7), // First tone louder
      [1, 2] // Fundamental + octave
    );
    
    const startTime = context.currentTime + (index * 0.1);
    
    oscillators.forEach(osc => {
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  });
}

/**
 * Ensure audio context is ready (for iOS compatibility)
 */
export async function ensureSoundEffectsReady(): Promise<void> {
  const context = getAudioContext();
  if (!context) return;
  
  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch (error) {
      console.warn('Could not resume sound effects AudioContext:', error);
    }
  }
}

