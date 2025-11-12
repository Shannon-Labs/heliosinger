/**
 * Heliosinger Vowel Formant Filter System
 * 
 * This module creates vowel-like sounds using formant filters,
 * making the sun literally "sing" its space weather story.
 * 
 * Based on speech synthesis research - vowels are characterized by
 * their formant frequencies (peaks in the frequency spectrum).
 */

export type VowelName = 'I' | 'E' | 'A' | 'O' | 'U';

export interface VowelFormants {
  name: VowelName;
  displayName: string;
  ipaSymbol: string;
  description: string;
  formants: number[]; // Frequencies in Hz (F1, F2, F3, F4) - IPA standard values
  bandwidths: number[]; // Bandwidths for each formant
  openness: number; // 0-1, how open the vowel is (A=1.0, I=0.0)
  brightness: number; // 0-1, spectral brightness
  frontness: number; // 0-1, how front the vowel is (I=1.0, U=0.0)
}

/**
 * Vowel formant database - IPA standard vowels
 * Formant frequencies based on IPA standards for adult male voice
 * F1 (height): Low F1 = high tongue, High F1 = low tongue
 * F2 (frontness): High F2 = front tongue, Low F2 = back tongue
 */
export const VOWEL_FORMANTS: Record<VowelName, VowelFormants> = {
  'I': {
    name: 'I',
    displayName: 'I',
    ipaSymbol: '/i/',
    description: 'Close front unrounded (as in "see")',
    formants: [270, 2290, 3010, 3400], // IPA standard: low F1, high F2
    bandwidths: [60, 100, 120, 150],
    openness: 0.0,
    brightness: 1.0,
    frontness: 1.0
  },
  'E': {
    name: 'E',
    displayName: 'E',
    ipaSymbol: '/e/',
    description: 'Close-mid front unrounded (as in "bed")',
    formants: [530, 1840, 2480, 3000], // IPA standard: mid F1, high F2
    bandwidths: [70, 100, 120, 140],
    openness: 0.4,
    brightness: 0.7,
    frontness: 0.8
  },
  'A': {
    name: 'A',
    displayName: 'A',
    ipaSymbol: '/a/',
    description: 'Open front unrounded (as in "father")',
    formants: [730, 1090, 2440, 3300], // IPA standard: high F1, mid F2
    bandwidths: [80, 90, 130, 150],
    openness: 1.0,
    brightness: 0.5,
    frontness: 0.5
  },
  'O': {
    name: 'O',
    displayName: 'O',
    ipaSymbol: '/o/',
    description: 'Close-mid back rounded (as in "go")',
    formants: [570, 840, 2410, 3300], // IPA standard: mid F1, low F2
    bandwidths: [70, 80, 120, 150],
    openness: 0.6,
    brightness: 0.4,
    frontness: 0.2
  },
  'U': {
    name: 'U',
    displayName: 'U',
    ipaSymbol: '/u/',
    description: 'Close back rounded (as in "boot")',
    formants: [300, 870, 2240, 3100], // IPA standard: low F1, low F2
    bandwidths: [60, 80, 100, 130],
    openness: 0.2,
    brightness: 0.2,
    frontness: 0.0
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
  
  // Temperature → brightness (hot = bright vowel like 'I')
  const targetBrightness = normalizedTemp;
  
  // Bz → frontness (southward = front vowel like 'I', northward = back like 'U')
  const targetFrontness = (normalizedBz < 0) ? 1 - Math.abs(normalizedBz) : 0.5 - (normalizedBz * 0.5);
  
  // Kp → vowel stability (high activity = more vowel movement)
  const vowelStability = 1 - (normalizedKp * 0.5);

  // Find the vowel that best matches these characteristics
  let bestVowel: VowelFormants = VOWEL_FORMANTS['A']; // default
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
    const vowelNames: VowelName[] = ['I', 'E', 'A', 'O', 'U'];
    const randomVowel = vowelNames[Math.floor(Math.random() * vowelNames.length)];
    return VOWEL_FORMANTS[randomVowel];
  }

  return bestVowel;
}

/**
 * Get a poetic description of what the sun is "saying"
 * Balanced descriptions that are engaging but not terrifying
 */
export function getSolarMoodDescription(
  vowel: VowelFormants,
  condition: 'quiet' | 'moderate' | 'storm' | 'extreme'
): string {
  const moodDescriptions = {
    'quiet': {
      'I': 'The sun softly sings a bright, clear note',
      'E': 'The sun peacefully resonates with gentle warmth',
      'A': 'The sun breathes a calm, open tone',
      'O': 'The sun softly intones with rounded warmth',
      'U': 'The sun quietly rumbles in the distance'
    },
    'moderate': {
      'I': 'The sun sings brightly with growing energy',
      'E': 'The sun resonates with moderate strength',
      'A': 'The sun calls out with open clarity',
      'O': 'The sun proclaims with rounded tones',
      'U': 'The sun intones with deep resonance'
    },
    'storm': {
      'I': 'The sun sings with brilliant intensity',
      'E': 'The sun resonates with strong energy',
      'A': 'The sun sings with powerful resonance',
      'O': 'The sun intones with deep strength',
      'U': 'The sun resonates with deep authority'
    },
    'extreme': {
      'I': 'The sun sings with maximum brightness',
      'E': 'The sun resonates with great power',
      'A': 'The sun sings with profound resonance',
      'O': 'The sun intones with cosmic strength',
      'U': 'The sun resonates with deep majesty'
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
    ipaSymbol: `${vowelA.ipaSymbol}→${vowelB.ipaSymbol}`,
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
