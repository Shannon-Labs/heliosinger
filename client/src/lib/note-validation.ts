import type { ChordTone } from './heliosinger-mapping';
import { midiNoteToFrequency, midiNoteToNoteName } from './midi-mapping';

/**
 * Validate chord voicing intervals
 */
export function validateChordIntervals(chordVoicing: ChordTone[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (chordVoicing.length === 0) {
    errors.push('Chord voicing is empty');
    return { valid: false, errors, warnings };
  }

  const root = chordVoicing[0];
  const intervals: number[] = [];

  // Check each chord tone
  for (let i = 1; i < chordVoicing.length; i++) {
    const tone = chordVoicing[i];
    const interval = tone.midiNote - root.midiNote;

    // Validate MIDI note range (21 = A0, 108 = C8)
    if (tone.midiNote < 21 || tone.midiNote > 108) {
      warnings.push(`Note ${tone.noteName} (MIDI ${tone.midiNote}) is outside playable range (21-108)`);
    }

    // Validate frequency matches MIDI note
    const expectedFreq = midiNoteToFrequency(tone.midiNote);
    const freqDiff = Math.abs(tone.frequency - expectedFreq);
    if (freqDiff > 0.1) {
      errors.push(`Frequency mismatch for ${tone.noteName}: expected ${expectedFreq.toFixed(2)} Hz, got ${tone.frequency.toFixed(2)} Hz`);
    }

    // Validate note name matches MIDI note
    const expectedNoteName = midiNoteToNoteName(tone.midiNote);
    if (tone.noteName !== expectedNoteName) {
      errors.push(`Note name mismatch: MIDI ${tone.midiNote} should be ${expectedNoteName}, got ${tone.noteName}`);
    }

    intervals.push(interval);
  }

  // Check for common interval errors
  const validIntervals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];
  intervals.forEach((interval, i) => {
    if (!validIntervals.includes(interval)) {
      warnings.push(`Unusual interval: ${interval} semitones between root and ${chordVoicing[i + 1].noteName}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get interval name from semitone distance
 */
export function getIntervalName(semitones: number): string {
  const intervals: Record<number, string> = {
    0: 'Unison',
    1: 'Minor 2nd',
    2: 'Major 2nd',
    3: 'Minor 3rd',
    4: 'Major 3rd',
    5: 'Perfect 4th',
    6: 'Tritone',
    7: 'Perfect 5th',
    8: 'Minor 6th',
    9: 'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th',
    12: 'Octave',
    14: 'Major 9th'
  };
  return intervals[semitones] || `${semitones} semitones`;
}

