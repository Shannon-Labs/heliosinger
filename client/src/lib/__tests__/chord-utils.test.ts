import { describe, it, expect } from 'vitest';
import { getChordQuality } from '../chord-utils';
import type { ChordTone } from '../heliosinger-mapping';
import type { SpaceWeatherCondition } from '@shared/schema';

describe('Chord Utils - Music Theory Accuracy', () => {
  describe('Interval Verification', () => {
    it('should correctly identify major triad intervals', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 }, // Root
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 }, // Major 3rd (+4)
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }  // Perfect 5th (+7)
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);

      expect(result.name).toBe('Major Triad');
      expect(result.symbol).toBe('C');
      expect(result.intervals).toContain('Major 3rd (+4 semitones)');
      expect(result.intervals).toContain('Perfect 5th (+7 semitones)');
      expect(result.construction).toContain('Western tertian harmony');
      expect(result.construction).toContain('major 3rd (4 semitones)');
      expect(result.construction).toContain('perfect 5th (7 semitones)');
    });

    it('should correctly identify minor triad intervals', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 }, // Root
        { frequency: 311.13, midiNote: 63, noteName: 'D#4', amplitude: 0.4 }, // Minor 3rd (+3)
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }  // Perfect 5th (+7)
      ];

      const result = getChordQuality('storm', chordVoicing, 80000, 15, -10, 6);

      expect(result.name).toBe('Minor Triad');
      expect(result.symbol).toBe('Cm');
      expect(result.intervals).toContain('Minor 3rd (+3 semitones)');
      expect(result.intervals).toContain('Perfect 5th (+7 semitones)');
      expect(result.construction).toContain('minor 3rd (3 semitones)');
    });

    it('should correctly identify minor 7th chord', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },   // Root
        { frequency: 311.13, midiNote: 63, noteName: 'D#4', amplitude: 0.4 }, // Minor 3rd (+3)
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }, // Perfect 5th (+7)
        { frequency: 466.16, midiNote: 70, noteName: 'A#4', amplitude: 0.25 }  // Minor 7th (+10)
      ];

      const result = getChordQuality('storm', chordVoicing, 80000, 25, -12, 6);

      expect(result.name).toBe('Minor 7th Chord');
      expect(result.symbol).toBe('Cm7');
      expect(result.intervals).toContain('Minor 7th (+10 semitones)');
    });

    it('should correctly identify major 6th chord', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },   // Root
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 }, // Major 3rd (+4)
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }, // Perfect 5th (+7)
        { frequency: 493.88, midiNote: 71, noteName: 'B4', amplitude: 0.25 }  // Major 6th (+11, but normalized to +9)
      ];

      const result = getChordQuality('moderate', chordVoicing, 120000, 15, -5, 4);

      expect(result.name).toBe('Major 6th Chord');
      expect(result.symbol).toBe('CMaj6');
    });

    it('should correctly identify dissonant cluster', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },   // Root
        { frequency: 277.18, midiNote: 61, noteName: 'C#4', amplitude: 0.3 }, // Minor 2nd (+1)
        { frequency: 369.99, midiNote: 66, noteName: 'F#4', amplitude: 0.25 }  // Tritone (+6)
      ];

      const result = getChordQuality('extreme', chordVoicing, 150000, 30, -18, 8);

      expect(result.name).toBe('Dissonant Cluster');
      expect(result.symbol).toBe('C°');
      expect(result.intervals).toContain('Minor 2nd');
      expect(result.intervals).toContain('Tritone');
    });
  });

  describe('Music Theory Accuracy', () => {
    it('should use correct interval names', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 }, // Root
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 }, // +4
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }  // +7
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);

      // Should not contain subjective language
      expect(result.construction).not.toContain('emotional');
      expect(result.construction).not.toContain('brightness');
      expect(result.construction).not.toContain('darkness');
      expect(result.construction).not.toContain('color');
      
      // Should contain factual information
      expect(result.construction).toContain('Western tertian harmony');
      expect(result.construction).toContain('semitones');
      expect(result.construction).toContain('interval');
    });

    it('should not claim false harmonic series derivation', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);

      // Should NOT claim harmonic series derivation
      expect(result.construction).not.toContain('harmonic series');
      expect(result.construction).not.toContain('5f harmonic');
      expect(result.construction).not.toContain('3f harmonic');
      
      // Should explain actual construction
      expect(result.construction).toContain('Western tertian harmony');
      expect(result.construction).toContain('stacking');
    });

    it('should be honest about aesthetic vs physical mappings', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);

      // Physics mapping should describe actual physics
      expect(result.physicsMapping).toContain('temperature');
      expect(result.physicsMapping).toContain('density');
      expect(result.physicsMapping).toMatch(/[0-9]/); // Should contain numbers
      
      // Aesthetic mapping should be honest
      expect(result.aestheticMapping).toContain('aesthetic');
      expect(result.aestheticMapping).toContain('choice');
      expect(result.aestheticMapping).toContain('perceptual');
      expect(result.aestheticMapping).not.toContain('physical');
    });
  });

  describe('Astronomical Accuracy', () => {
    it('should describe temperature accurately', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const temp = 125000;
      const result = getChordQuality('quiet', chordVoicing, temp, 3, 2, 1);

      // Should mention the actual temperature
      expect(result.physicsMapping).toContain(temp.toFixed(0));
      expect(result.physicsMapping.toLowerCase()).toMatch(/temperature|thermal|kelvin/);
    });

    it('should describe density accurately', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const density = 12.5;
      const result = getChordQuality('moderate', chordVoicing, 120000, density, -5, 4);

      // Should mention the actual density
      expect(result.physicsMapping).toContain(density.toFixed(1));
      expect(result.physicsMapping.toLowerCase()).toMatch(/density|particles|plasma/);
    });

    it('should describe Bz accurately', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 311.13, midiNote: 63, noteName: 'D#4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const bz = -12.3;
      const result = getChordQuality('storm', chordVoicing, 80000, 15, bz, 6);

      // Should mention Bz value
      expect(result.physicsMapping).toContain(bz.toFixed(1));
      expect(result.physicsMapping.toLowerCase()).toMatch(/bz|magnetic|field/);
    });

    it('should mention that 100,000K threshold is arbitrary', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);

      // Should be honest about arbitrary threshold
      expect(result.aestheticMapping.toLowerCase()).toMatch(/arbitrary|threshold|variety/);
    });
  });

  describe('Fallback Behavior', () => {
    it('should provide fallback for missing voicing', () => {
      const result = getChordQuality('quiet', undefined, 120000, 3, 2, 1);

      expect(result.name).toBe('Major Triad');
      expect(result.symbol).toBe('Maj');
      expect(result.construction).toContain('Western tertian harmony');
    });

    it('should provide fallback for extreme condition', () => {
      const result = getChordQuality('extreme', undefined, 150000, 30, -18, 8);

      expect(result.name).toBe('Dissonant Cluster');
      expect(result.symbol).toBe('°');
      expect(result.construction).toContain('Dissonant interval combination');
    });
  });

  describe('Chord Symbol Accuracy', () => {
    it('should use correct symbols for major chords', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const result = getChordQuality('quiet', chordVoicing, 120000, 3, 2, 1);
      expect(result.symbol).toBe('C'); // Major triad uses just the note name
    });

    it('should use correct symbols for minor chords', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 311.13, midiNote: 63, noteName: 'D#4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 }
      ];

      const result = getChordQuality('storm', chordVoicing, 80000, 15, -10, 6);
      expect(result.symbol).toBe('Cm'); // Minor uses 'm' suffix
    });

    it('should use correct symbols for extended chords', () => {
      const chordVoicing: ChordTone[] = [
        { frequency: 261.63, midiNote: 60, noteName: 'C4', amplitude: 1.0 },
        { frequency: 329.63, midiNote: 64, noteName: 'E4', amplitude: 0.4 },
        { frequency: 392.00, midiNote: 67, noteName: 'G4', amplitude: 0.35 },
        { frequency: 493.88, midiNote: 71, noteName: 'B4', amplitude: 0.25 }
      ];

      const result = getChordQuality('moderate', chordVoicing, 120000, 15, -5, 4);
      expect(result.symbol).toBe('CMaj6'); // Major 6th chord
    });
  });
});
