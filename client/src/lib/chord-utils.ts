import type { SpaceWeatherCondition } from '@shared/schema';

export interface ChordQuality {
  name: string;
  description: string;
  intervals: string[];
  condition: SpaceWeatherCondition;
}

/**
 * Determine chord quality based on space weather condition
 * Matches the logic in heliosinger-mapping.ts calculateChordVoicing
 */
export function getChordQuality(condition: SpaceWeatherCondition): ChordQuality {
  switch (condition) {
    case 'quiet':
      return {
        name: 'Major Triad',
        description: 'Stable, consonant harmony reflecting calm solar conditions. The major third and perfect fifth create a bright, stable sound.',
        intervals: ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)'],
        condition: 'quiet',
      };
      
    case 'moderate':
      return {
        name: 'Major 6',
        description: 'Rich, complex harmony with added sixth. The extended intervals add depth while maintaining consonance.',
        intervals: ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)', 'Major 6th (+9 semitones)'],
        condition: 'moderate',
      };
      
    case 'storm':
      return {
        name: 'Minor',
        description: 'Tense, dramatic harmony reflecting geomagnetic activity. Minor intervals create emotional depth and urgency.',
        intervals: ['Root', 'Minor 3rd (+3 semitones)', 'Perfect 5th (+7 semitones)', 'Minor 6th (+8 semitones)'],
        condition: 'storm',
      };
      
    case 'extreme':
      return {
        name: 'Dissonant',
        description: 'Chaotic, intense harmony with dissonant intervals. The tritone and minor second create maximum tension, reflecting extreme space weather.',
        intervals: ['Root', 'Minor 2nd (+1 semitone)', 'Tritone (+6 semitones)', 'Perfect 5th (+7 semitones)'],
        condition: 'extreme',
      };
      
    default:
      return {
        name: 'Major Triad',
        description: 'Default stable harmony.',
        intervals: ['Root', 'Major 3rd', 'Perfect 5th'],
        condition: 'quiet',
      };
  }
}

/**
 * Get explanation of why this chord was selected
 */
export function getChordSelectionExplanation(condition: SpaceWeatherCondition): string {
  switch (condition) {
    case 'quiet':
      return 'Quiet solar conditions produce stable major triads. The consonant intervals reflect calm, predictable space weather.';
    case 'moderate':
      return 'Moderate activity adds harmonic extensions. The major 6th adds richness while maintaining stability.';
    case 'storm':
      return 'Geomagnetic storms create minor harmonies. The darker intervals reflect increased activity and tension.';
    case 'extreme':
      return 'Extreme conditions generate dissonant intervals. The tritone and minor second create maximum harmonic tension.';
    default:
      return 'Chord selection based on current space weather conditions.';
  }
}

