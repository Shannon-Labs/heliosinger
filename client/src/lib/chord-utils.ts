import type { SpaceWeatherCondition } from '@shared/schema';
import type { ChordTone } from './heliosinger-mapping';

export interface ChordQuality {
  name: string;
  symbol: string; // Chord symbol (e.g., "Cm", "CMaj6", "Cm7")
  description: string;
  intervals: string[];
  construction: string; // How the chord is actually built
  condition: SpaceWeatherCondition;
  physicsMapping: string; // What the physical parameters represent
  aestheticMapping: string; // How we mapped them musically (be honest!)
}

/**
 * Analyze chord voicing and determine chord quality with accurate music theory
 * Provides educational descriptions based on actual chord construction
 * 
 * IMPORTANT: This is a creative sonification, not a physical model.
 * Mappings are chosen for perceptual clarity and musical interest,
 * not because space weather "creates" specific chords.
 */
export function getChordQuality(
  condition: SpaceWeatherCondition,
  chordVoicing?: ChordTone[],
  temperature?: number,
  density?: number,
  bz?: number,
  kp?: number
): ChordQuality {
  // Analyze chord voicing if provided
  let chordName = '';
  let chordSymbol = '';
  let intervals: string[] = [];
  let construction = '';
  let physicsMapping = '';
  let aestheticMapping = '';

  if (chordVoicing && chordVoicing.length > 1) {
    const root = chordVoicing[0];
    const intervalsFromRoot: number[] = [];
    
    // Calculate intervals from root
    for (let i = 1; i < chordVoicing.length; i++) {
      const interval = chordVoicing[i].midiNote - root.midiNote;
      intervalsFromRoot.push(interval);
    }

    // Identify chord type based on intervals
    const hasMinorThird = intervalsFromRoot.includes(3);
    const hasMajorThird = intervalsFromRoot.includes(4);
    const hasPerfectFifth = intervalsFromRoot.includes(7);
    const hasMinorSixth = intervalsFromRoot.includes(8);
    const hasMajorSixth = intervalsFromRoot.includes(9);
    const hasMinorSeventh = intervalsFromRoot.includes(10);
    const hasMajorNinth = intervalsFromRoot.includes(14);
    const hasTritone = intervalsFromRoot.includes(6);
    const hasMinorSecond = intervalsFromRoot.includes(1);

    // Build chord name and symbol
    const rootNote = root.noteName.split(/\d/)[0]; // Extract note name without octave
    
    if (hasTritone || hasMinorSecond) {
      // Dissonant/extreme chords
      chordName = 'Dissonant Cluster';
      chordSymbol = `${rootNote}°`; // Diminished symbol
      intervals = intervalsFromRoot.map(i => getIntervalName(i));
      construction = 'Dissonant interval combination: Minor 2nd (16:15 frequency ratio) and tritone (45:32 or 64:45). These intervals have high ratio complexity, creating perceptual tension in Western music.';
      physicsMapping = `Extreme space weather: Kp = ${kp || 'extreme'}, Bz = ${bz?.toFixed(1) || 'extreme'} nT. These values indicate severe geomagnetic storm conditions with strong energy input into Earth's magnetosphere.`;
      aestheticMapping = 'Maximum dissonance for maximum perceptual distinction. Minor 2nd and tritone are the most dissonant intervals in Western music (highly complex frequency ratios). Chosen to sound "wrong" and alarming, appropriate for dangerous space weather.';
    } else if (hasMinorThird && hasPerfectFifth) {
      // Minor triad
      if (hasMinorSeventh) {
        chordName = 'Minor 7th Chord';
        chordSymbol = `${rootNote}m7`;
        intervals = ['Root', 'Minor 3rd (+3 semitones)', 'Perfect 5th (+7 semitones)', 'Minor 7th (+10 semitones)'];
        construction = 'Western tertian harmony: Minor triad (root, minor 3rd, perfect 5th) with added minor 7th. The 7th is the 7th scale degree lowered by a semitone. Common in jazz and popular music.';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K (particle thermal energy), Density: ${density?.toFixed(1) || 'N/A'} p/cm³ (particle concentration), Bz: ${bz?.toFixed(1) || 'N/A'} nT (magnetic field orientation).`;
        aestheticMapping = `Minor quality mapped to temperatures below 100,000K (arbitrary threshold for variety). Minor 7th extension added when density > 20 p/cm³ AND southward Bz < -10 nT. These thresholds chosen to create perceptual variety, not for physical reasons.`;
      } else if (hasMinorSixth) {
        chordName = 'Minor 6th Chord';
        chordSymbol = `${rootNote}m6`;
        intervals = ['Root', 'Minor 3rd (+3 semitones)', 'Perfect 5th (+7 semitones)', 'Minor 6th (+8 semitones)'];
        construction = 'Western tertian harmony: Minor triad with added major 6th (note: "minor 6th chord" is a misnomer - it contains a major 6th interval, 9 semitones from root). Built from stacked thirds: minor 3rd, major 3rd (between 3rd and 5th), major 2nd (between 5th and 6th).';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K, Density: ${density?.toFixed(1) || 'N/A'} p/cm³. Temperature indicates particle kinetic energy; density indicates plasma compression.`;
        aestheticMapping = `Minor quality (temperature < 100,000K) with major 6th extension at moderate density (10-20 p/cm³). The major 6th provides a less tense sound than the minor 7th, chosen for moderate activity levels.`;
      } else {
        chordName = 'Minor Triad';
        chordSymbol = `${rootNote}m`;
        intervals = ['Root', 'Minor 3rd (+3 semitones)', 'Perfect 5th (+7 semitones)'];
        construction = 'Western tertian harmony: Three-note chord built from root, minor 3rd (3 semitones), and perfect 5th (7 semitones). The interval ratio between root and 5th is 3:2 (perfect 5th), between root and minor 3rd is approximately 6:5.';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K, Density: ${density?.toFixed(1) || 'N/A'} p/cm³. Low temperature indicates cooler plasma, possibly from solar coronal regions.`;
        aestheticMapping = `Minor quality mapped to temperatures below 100,000K. Triad voicing (no extensions) used for low density (< 5 p/cm³) to create simplicity. These are aesthetic choices for sonic variety, not physical relationships.`;
      }
    } else if (hasMajorThird && hasPerfectFifth) {
      // Major triad
      if (hasMajorNinth) {
        chordName = 'Major 9th Chord';
        chordSymbol = `${rootNote}Maj9`;
        intervals = ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)', 'Major 9th (+14 semitones)'];
        construction = 'Western tertian harmony: Major triad with added major 9th (compound interval: major 2nd + octave). The 9th is the 2nd scale degree raised by an octave. Creates a complex, jazzy sound with high harmonic density.';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K (high energy), Density: ${density?.toFixed(1) || 'N/A'} p/cm³ (highly compressed plasma). High temperature/density often indicates active solar regions.`;
        aestheticMapping = `Major quality (temperature ≥ 100,000K) with major 9th extension at very high density (> 35 p/cm³). The 9th creates maximum harmonic complexity, chosen to represent the most extreme quiet conditions before storm activity.`;
      } else if (hasMajorSixth) {
        chordName = 'Major 6th Chord';
        chordSymbol = `${rootNote}Maj6`;
        intervals = ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)', 'Major 6th (+9 semitones)'];
        construction = 'Western tertian harmony: Major triad with added major 6th. The 6th is the same pitch as the 13th (6th scale degree). In chord notation, "6" indicates added tone chord, not an extended harmony.';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K, Density: ${density?.toFixed(1) || 'N/A'} p/cm³. Moderate conditions typical of ambient solar wind.`;
        aestheticMapping = `Major quality (temperature ≥ 100,000K) with major 6th extension at moderate density (10-20 p/cm³). The 6th provides color without the tension of a 7th, appropriate for moderate activity levels.`;
      } else {
        chordName = 'Major Triad';
        chordSymbol = `${rootNote}`;
        intervals = ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)'];
        construction = 'Western tertian harmony: Three-note chord built from root, major 3rd (4 semitones), and perfect 5th (7 semitones). The interval ratios are approximately 5:4 (major 3rd) and 3:2 (perfect 5th). Considered "consonant" in Western music theory.';
        physicsMapping = `Solar wind temperature: ${temperature?.toFixed(0) || 'N/A'}K, Density: ${density?.toFixed(1) || 'N/A'} p/cm³. Low density, moderate temperature typical of quiet solar conditions.`;
        aestheticMapping = `Major quality mapped to temperatures ≥ 100,000K. Simple triad voicing (no extensions) for low density (< 5 p/cm³). These choices create stable, "resolved" sounds for quiet conditions.`;
      }
    } else {
      // Fallback - use condition-based naming
      chordName = condition === 'quiet' ? 'Major Triad' : condition === 'storm' ? 'Minor Triad' : 'Extended Chord';
      chordSymbol = rootNote;
      intervals = intervalsFromRoot.map(i => getIntervalName(i));
      construction = 'Western harmony construction. Intervals measured in semitones from root.';
      physicsMapping = 'Chord quality determined by space weather parameter ranges.';
      aestheticMapping = 'Fallback mapping when specific interval analysis fails. Uses condition-based defaults.';
    }
  } else {
    // Fallback to condition-based if no voicing provided
    switch (condition) {
      case 'quiet':
        chordName = 'Major Triad';
        chordSymbol = 'Maj';
        intervals = ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)'];
        construction = 'Western tertian harmony: Three-note chord (root, major 3rd, perfect 5th). Interval ratios: 5:4 (major 3rd), 3:2 (perfect 5th).';
        physicsMapping = 'Quiet conditions: Kp < 3, low geomagnetic activity. Solar wind typically slow (< 400 km/s) and less geoeffective.';
        aestheticMapping = 'Major quality chosen for stability. Simple triad (no extensions) represents simplicity of quiet space weather. Aesthetic choice for perceptual clarity.';
        break;
      case 'moderate':
        chordName = 'Major 6th Chord';
        chordSymbol = 'Maj6';
        intervals = ['Root', 'Major 3rd (+4 semitones)', 'Perfect 5th (+7 semitones)', 'Major 6th (+9 semitones)'];
        construction = 'Western tertian harmony: Major triad with added major 6th. The 6th is the same note as the 13th (6th scale degree).';
        physicsMapping = 'Moderate conditions: Kp 3-4, increasing geomagnetic activity. Solar wind may show some variability, possible weak geoeffectiveness.';
        aestheticMapping = 'Major quality with added 6th extension. The 6th provides color without the tension of a 7th, appropriate for moderate activity. Chosen for musical interest.';
        break;
      case 'storm':
        chordName = 'Minor Triad';
        chordSymbol = 'm';
        intervals = ['Root', 'Minor 3rd (+3 semitones)', 'Perfect 5th (+7 semitones)'];
        construction = 'Western tertian harmony: Three-note chord (root, minor 3rd, perfect 5th). Interval ratio for minor 3rd is approximately 6:5.';
        physicsMapping = 'Storm conditions: Kp ≥ 5, active geomagnetic storm. Southward Bz likely present, causing energy transfer into magnetosphere.';
        aestheticMapping = 'Minor quality chosen for contrast with quiet conditions. Minor triads sound "darker" than major to Western ears. Used to perceptually distinguish storm conditions.';
        break;
      case 'extreme':
        chordName = 'Dissonant Cluster';
        chordSymbol = '°';
        intervals = ['Root', 'Minor 2nd (+1 semitone)', 'Tritone (+6 semitones)'];
        construction = 'Dissonant interval combination: Minor 2nd (16:15 frequency ratio) and tritone (45:32 or 64:45). These intervals have high ratio complexity, creating perceptual tension in Western music.';
        physicsMapping = 'Extreme conditions: Kp ≥ 7, severe geomagnetic storm. Strong southward Bz (< -15 nT), high solar wind velocity (> 600 km/s). Dangerous for satellites and power grids.';
        aestheticMapping = 'Maximum dissonance for maximum perceptual distinction. Minor 2nd and tritone are the most dissonant intervals in Western music (highly complex frequency ratios). Chosen to sound "wrong" and alarming, appropriate for dangerous space weather.';
        break;
      default:
        chordName = 'Major Triad';
        chordSymbol = 'Maj';
        intervals = ['Root', 'Major 3rd', 'Perfect 5th'];
        construction = 'Western tertian harmony.';
        physicsMapping = 'Default quiet conditions.';
        aestheticMapping = 'Default stable harmony.';
    }
  }

  return {
    name: chordName,
    symbol: chordSymbol,
    description: `${chordName} (${chordSymbol}): ${intervals.join(', ')}.`,
    intervals,
    construction,
    condition,
    physicsMapping,
    aestheticMapping
  };
}

/**
 * Get interval name from semitone distance
 */
function getIntervalName(semitones: number): string {
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

/**
 * Get explanation of why this chord was selected
 * This function is kept for backward compatibility but now uses aestheticMapping from ChordQuality
 */
export function getChordSelectionExplanation(condition: SpaceWeatherCondition): string {
  switch (condition) {
    case 'quiet':
      return 'Quiet solar conditions produce stable major triads. The major quality is an aesthetic choice for perceptual clarity, not a physical property of quiet space weather. Temperature threshold (≥100,000K) is arbitrary.';
    case 'moderate':
      return 'Moderate activity adds harmonic extensions. The major 6th chord provides color without tension. Density thresholds are chosen for musical variety, not physical reasons.';
    case 'storm':
      return 'Geomagnetic storms mapped to minor harmonies. The minor quality is chosen for perceptual contrast with quiet conditions, not because storms are "sad". Minor triads use a minor 3rd (3 semitones) instead of major 3rd (4 semitones).';
    case 'extreme':
      return 'Extreme conditions generate dissonant intervals. The tritone (6 semitones) and minor 2nd (1 semitone) are chosen for maximum perceptual tension, appropriate for dangerous space weather. This is an aesthetic choice, not a physical phenomenon.';
    default:
      return 'Chord selection based on space weather conditions. This is a creative sonification mapping space physics to Western musical harmony for perceptual clarity and educational value.';
  }
}
