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

// Track previous vowel for hysteresis
let previousVowel: VowelFormants | null = null;
let previousScore = 0;

/**
 * Get vowel from space weather parameters
 * Improved algorithm with better variability and hysteresis
 */
export function getVowelFromSpaceWeather(
  density: number,
  temperature: number,
  bz: number,
  kp: number,
  velocity?: number
): VowelFormants {
  // Normalize parameters to 0-1 range with wider ranges for more distinct zones
  const normalizedDensity = Math.max(0, Math.min(1, (density - 0.5) / 49.5));
  const normalizedTemp = Math.max(0, Math.min(1, (temperature - 10000) / 190000));
  const normalizedBz = Math.max(-1, Math.min(1, bz / 20)); // -1 (south) to +1 (north)
  const normalizedKp = Math.max(0, Math.min(1, kp / 9));
  
  // Include velocity in brightness calculation (fast = brighter)
  const normalizedVelocity = velocity !== undefined 
    ? Math.max(0, Math.min(1, (velocity - 200) / 600)) // 200-800 km/s range
    : 0.5; // Default to middle if not provided

  // Calculate target vowel characteristics with improved mapping
  // Density → openness (inverse: high density = closed vowel)
  const targetOpenness = 1 - normalizedDensity;
  
  // Temperature + Velocity → brightness (hot + fast = bright vowel like 'I')
  const targetBrightness = Math.min(1, normalizedTemp * 0.7 + normalizedVelocity * 0.3);
  
  // Bz → frontness (improved mapping using full range)
  // Southward Bz (< 0) → front vowels (I, E)
  // Northward Bz (> 0) → back vowels (O, U)
  // Near zero → central vowels (A)
  let targetFrontness: number;
  if (normalizedBz < -0.3) {
    // Strong southward → very front
    targetFrontness = 0.8 + (Math.abs(normalizedBz) - 0.3) * 0.2;
  } else if (normalizedBz > 0.3) {
    // Strong northward → very back
    targetFrontness = 0.2 - (normalizedBz - 0.3) * 0.2;
  } else {
    // Near zero → central
    targetFrontness = 0.3 + (0.3 + normalizedBz) * 0.4;
  }
  targetFrontness = Math.max(0, Math.min(1, targetFrontness));
  
  // Add time-based micro-variation for subtle movement even in stable conditions
  const timeVariation = Math.sin(Date.now() / 15000) * 0.08; // ±8% variation over 15 seconds
  const targetBrightnessWithVariation = Math.max(0, Math.min(1, targetBrightness + timeVariation * 0.3));
  const targetFrontnessWithVariation = Math.max(0, Math.min(1, targetFrontness + timeVariation * 0.2));

  // Find the vowel that best matches these characteristics using squared distance for sharper distinctions
  let bestVowel: VowelFormants = VOWEL_FORMANTS['A']; // default
  let bestScore = Infinity; // Lower is better with squared distance

  Object.values(VOWEL_FORMANTS).forEach(vowel => {
    // Calculate squared distance (sharper distinctions)
    const opennessDiff = vowel.openness - targetOpenness;
    const brightnessDiff = vowel.brightness - targetBrightnessWithVariation;
    const frontnessDiff = vowel.frontness - targetFrontnessWithVariation;
    
    // Squared distance with weights (frontness most important)
    const squaredDistance = 
      Math.pow(opennessDiff, 2) * 0.25 +
      Math.pow(brightnessDiff, 2) * 0.35 +
      Math.pow(frontnessDiff, 2) * 0.40;
    
    if (squaredDistance < bestScore) {
      bestScore = squaredDistance;
      bestVowel = vowel;
    }
  });

  // Hysteresis: require significant change to switch vowels (prevents jitter)
  if (previousVowel) {
    const scoreDifference = Math.abs(bestScore - previousScore);
    const vowelChanged = bestVowel.name !== previousVowel.name;
    
    // If vowel changed but score difference is small, keep previous vowel
    if (vowelChanged && scoreDifference < 0.15) {
      return previousVowel;
    }
  }

  // Add randomness for variability (lower threshold, higher frequency)
  if (normalizedKp > 0.3 && Math.random() < 0.3) {
    // Randomly shift vowel during moderate+ activity
    const vowelNames: VowelName[] = ['I', 'E', 'A', 'O', 'U'];
    const randomVowel = vowelNames[Math.floor(Math.random() * vowelNames.length)];
    const selectedVowel = VOWEL_FORMANTS[randomVowel];
    previousVowel = selectedVowel;
    previousScore = bestScore;
    return selectedVowel;
  }

  // Update tracking
  previousVowel = bestVowel;
  previousScore = bestScore;

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
