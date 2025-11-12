/**
 * Heliosinger Vowel Formant Filter System
 * 
 * This module creates vowel-like sounds using formant filters,
 * making the sun literally "sing" its space weather story.
 * 
 * Based on speech synthesis research - vowels are characterized by
 * their formant frequencies (peaks in the frequency spectrum).
 */

export type VowelName = 'ee' | 'i' | 'eh' | 'ah' | 'oh' | 'oo' | 'uh';

export interface VowelFormants {
  name: VowelName;
  displayName: string;
  description: string;
  formants: number[]; // Frequencies in Hz (F1, F2, F3, optionally F4)
  bandwidths: number[]; // Bandwidths for each formant
  openness: number; // 0-1, how open the vowel is (ah=1.0, ee=0.0)
  brightness: number; // 0-1, spectral brightness
  frontness: number; // 0-1, how front the vowel is (ee=1.0, oo=0.0)
}

/**
 * Vowel formant database (approximate values for adult male voice)
 * Based on speech synthesis research
 */
export const VOWEL_FORMANTS: Record<VowelName, VowelFormants> = {
  'ee': {
    name: 'ee',
    displayName: 'ee',
    description: 'Bright, closed vowel (as in "see")',
    formants: [270, 2300, 3000, 3400],
    bandwidths: [60, 100, 120, 150],
    openness: 0.0,
    brightness: 1.0,
    frontness: 1.0
  },
  'i': {
    name: 'i',
    displayName: 'i',
    description: 'Bright, closed vowel (as in "sit")',
    formants: [390, 2000, 2600, 3100],
    bandwidths: [60, 90, 100, 120],
    openness: 0.1,
    brightness: 0.9,
    frontness: 0.9
  },
  'eh': {
    name: 'eh',
    displayName: 'eh',
    description: 'Mid vowel (as in "bed")',
    formants: [530, 1850, 2500, 3000],
    bandwidths: [70, 100, 120, 140],
    openness: 0.4,
    brightness: 0.6,
    frontness: 0.7
  },
  'ah': {
    name: 'ah',
    displayName: 'ah',
    description: 'Open vowel (as in "father")',
    formants: [730, 1100, 2700, 3300],
    bandwidths: [80, 90, 130, 150],
    openness: 1.0,
    brightness: 0.4,
    frontness: 0.5
  },
  'oh': {
    name: 'oh',
    displayName: 'oh',
    description: 'Rounded mid vowel (as in "go")',
    formants: [500, 900, 2700, 3300],
    bandwidths: [70, 80, 120, 150],
    openness: 0.6,
    brightness: 0.5,
    frontness: 0.3
  },
  'oo': {
    name: 'oo',
    displayName: 'oo',
    description: 'Dark, rounded vowel (as in "boot")',
    formants: [300, 900, 2300, 3100],
    bandwidths: [60, 80, 100, 130],
    openness: 0.2,
    brightness: 0.2,
    frontness: 0.0
  },
  'uh': {
    name: 'uh',
    displayName: 'uh',
    description: 'Neutral vowel (as in "but")',
    formants: [600, 1200, 2600, 3200],
    bandwidths: [75, 95, 120, 140],
    openness: 0.5,
    brightness: 0.5,
    frontness: 0.5
  }
};

/**
 * Get vowel from space weather parameters
 * This is where the poetic magic happens - the sun's "mood" determines the vowel
 */
export function getVowelFromSpaceWeather(
  density: number,
  temperature: number,
  bz: number,
  kp: number
): VowelFormants {
  // Normalize parameters to 0-1 range
  const normalizedDensity = Math.max(0, Math.min(1, (density - 0.5) / 49.5));
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - 10000) / 190000));
  const normalizedBz = Math.max(-1, Math.min(1, bz / 20)); // -1 (south) to +1 (north)
  const normalizedKp = Math.max(0, Math.min(1, kp / 9));

  // Calculate target vowel characteristics
  // Density → openness (inverse: high density = closed vowel)
  const targetOpenness = 1 - normalizedDensity;
  
  // Temperature → brightness (hot = bright vowel like 'ee')
  const targetBrightness = normalizedTemp;
  
  // Bz → frontness (southward = front vowel like 'ee', northward = back like 'oo')
  const targetFrontness = (normalizedBz < 0) ? 1 - Math.abs(normalizedBz) : 0.5 - (normalizedBz * 0.5);
  
  // Kp → vowel stability (high activity = more vowel movement)
  const vowelStability = 1 - (normalizedKp * 0.5);

  // Find the vowel that best matches these characteristics
  let bestVowel: VowelFormants = VOWEL_FORMANTS['ah']; // default
  let bestScore = -1;

  Object.values(VOWEL_FORMANTS).forEach(vowel => {
    // Calculate how well this vowel matches our target characteristics
    const opennessScore = 1 - Math.abs(vowel.openness - targetOpenness);
    const brightnessScore = 1 - Math.abs(vowel.brightness - targetBrightness);
    const frontnessScore = 1 - Math.abs(vowel.frontness - targetFrontness);
    
    // Weighted combination (frontness is most important for intelligibility)
    const totalScore = (opennessScore * 0.3) + (brightnessScore * 0.3) + (frontnessScore * 0.4);
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestVowel = vowel;
    }
  });

  // During high activity, add some randomness to vowel for "animated" effect
  if (normalizedKp > 0.7 && Math.random() < 0.1) {
    // Occasionally shift vowel during storms for dramatic effect
    const vowelNames: VowelName[] = ['ee', 'i', 'eh', 'ah', 'oh', 'oo', 'uh'];
    const randomVowel = vowelNames[Math.floor(Math.random() * vowelNames.length)];
    return VOWEL_FORMANTS[randomVowel];
  }

  return bestVowel;
}

/**
 * Get a poetic description of what the sun is "saying"
 * @param gentleMode - If true, uses gentler, less intense descriptions
 */
export function getSolarMoodDescription(
  vowel: VowelFormants,
  condition: 'quiet' | 'moderate' | 'storm' | 'extreme',
  gentleMode: boolean = false
): string {
  const moodDescriptions = gentleMode ? {
    'quiet': {
      'ee': 'The sun softly sings a bright, clear note',
      'i': 'The sun gently hums a light melody',
      'eh': 'The sun peacefully resonates',
      'ah': 'The sun breathes a calm, open tone',
      'oh': 'The sun softly intones',
      'oo': 'The sun quietly rumbles in the distance',
      'uh': 'The sun murmurs steadily'
    },
    'moderate': {
      'ee': 'The sun sings brightly with growing energy',
      'i': 'The sun\'s voice lifts with animation',
      'eh': 'The sun resonates with moderate strength',
      'ah': 'The sun calls out with open clarity',
      'oh': 'The sun proclaims with rounded tones',
      'oo': 'The sun intones with deep resonance',
      'uh': 'The sun speaks with steady voice'
    },
    'storm': {
      'ee': 'The sun sings with brilliant intensity',
      'i': 'The sun\'s voice rises with clarity',
      'eh': 'The sun resonates with strong energy',
      'ah': 'The sun sings with powerful resonance',
      'oh': 'The sun intones with deep strength',
      'oo': 'The sun resonates with deep authority',
      'uh': 'The sun sings with vibrant energy'
    },
    'extreme': {
      'ee': 'The sun sings with maximum brightness',
      'i': 'The sun\'s voice reaches peak intensity',
      'eh': 'The sun resonates with great power',
      'ah': 'The sun sings with profound resonance',
      'oh': 'The sun intones with cosmic strength',
      'oo': 'The sun resonates with deep majesty',
      'uh': 'The sun sings with intense energy'
    }
  } : {
    'quiet': {
      'ee': 'The sun softly sings a bright, clear note',
      'i': 'The sun gently hums a light melody',
      'eh': 'The sun peacefully resonates',
      'ah': 'The sun breathes a calm, open tone',
      'oh': 'The sun softly intones',
      'oo': 'The sun quietly rumbles in the distance',
      'uh': 'The sun murmurs steadily'
    },
    'moderate': {
      'ee': 'The sun sings brightly with growing energy',
      'i': 'The sun\'s voice lifts with animation',
      'eh': 'The sun resonates with moderate strength',
      'ah': 'The sun calls out with open clarity',
      'oh': 'The sun proclaims with rounded tones',
      'oo': 'The sun intones with deep resonance',
      'uh': 'The sun speaks with steady voice'
    },
    'storm': {
      'ee': 'The sun cries out in brilliant intensity',
      'i': 'The sun shouts with piercing clarity',
      'eh': 'The sun calls with urgent resonance',
      'ah': 'The sun roars with open power',
      'oh': 'The sun bellows with rounded force',
      'oo': 'The sun thunders with deep authority',
      'uh': 'The sun yells with raw energy'
    },
    'extreme': {
      'ee': 'THE SUN SCREAMS WITH BLINDING FURY',
      'i': 'THE SUN SHRIEKS WITH UNBRIDLED POWER',
      'eh': 'THE SUN THUNDERS WITH TERRIBLE FORCE',
      'ah': 'THE SUN ROARS WITH PRIMORDIAL MIGHT',
      'oh': 'THE SUN BOOMS WITH COSMIC AUTHORITY',
      'oo': 'THE SUN RUMBLES WITH DEEP CATASTROPHE',
      'uh': 'THE SUN ERUPTS WITH CHAOTIC ENERGY'
    }
  };

  return moodDescriptions[condition][vowel.name] || 'The sun sings';
}

/**
 * Interpolate between two vowels (for smooth transitions)
 */
export function interpolateVowels(
  vowelA: VowelFormants,
  vowelB: VowelFormants,
  factor: number // 0 = vowelA, 1 = vowelB
): VowelFormants {
  // Clamp factor to 0-1
  factor = Math.max(0, Math.min(1, factor));
  
  // Interpolate formant frequencies
  const interpolatedFormants = vowelA.formants.map((freq, i) => {
    const freqB = vowelB.formants[i] || freq;
    return freq + (freqB - freq) * factor;
  });
  
  // Interpolate bandwidths
  const interpolatedBandwidths = vowelA.bandwidths.map((bw, i) => {
    const bwB = vowelB.bandwidths[i] || bw;
    return bw + (bwB - bw) * factor;
  });
  
  // Create intermediate vowel
  return {
    name: factor < 0.5 ? vowelA.name : vowelB.name, // Use whichever is closer
    displayName: `${vowelA.displayName}→${vowelB.displayName}`,
    description: `Transitioning from ${vowelA.description} to ${vowelB.description}`,
    formants: interpolatedFormants,
    bandwidths: interpolatedBandwidths,
    openness: vowelA.openness + (vowelB.openness - vowelA.openness) * factor,
    brightness: vowelA.brightness + (vowelB.brightness - vowelA.brightness) * factor,
    frontness: vowelA.frontness + (vowelB.frontness - vowelA.frontness) * factor
  };
}

/**
 * Get formant filter settings for a given vowel and fundamental frequency
 * Scales formants based on fundamental to maintain vowel quality across pitches
 */
export function getFormantFiltersForVowel(
  vowel: VowelFormants,
  fundamentalFreq: number
): Array<{ frequency: number; bandwidth: number; gain: number }> {
  // Vowel scaling factor - adjust formants based on fundamental
  // This maintains vowel intelligibility across different pitches
  const scalingFactor = Math.pow(fundamentalFreq / 200, 0.8); // Base on 200Hz reference
  
  return vowel.formants.map((formant, i) => {
    // Scale formant frequency based on fundamental
    const scaledFrequency = formant * scalingFactor;
    
    // Use original bandwidth (less sensitive to pitch)
    const bandwidth = vowel.bandwidths[i] || 100;
    
    // Adjust gain based on vowel characteristics and formant number
    const baseGain = 1.0 - (i * 0.15); // Higher formants are quieter
    const brightnessBoost = vowel.brightness * 0.3;
    const gain = Math.max(0.1, Math.min(1.5, baseGain + brightnessBoost));
    
    return {
      frequency: scaledFrequency,
      bandwidth: bandwidth,
      gain: gain
    };
  });
}
