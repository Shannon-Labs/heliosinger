/**
 * Educational Narrator System
 *
 * The brain behind Heliosinger's documentary-style educational experience.
 * Intelligently decides WHAT to teach and WHEN based on live space weather data.
 *
 * Three tracks of knowledge:
 * 1. Space Weather Physics - Solar wind, CMEs, geomagnetic storms
 * 2. Acoustics & Sound Design - Why vowels sound different, harmonics, sonification
 * 3. Electromagnetism - IMF, Bz orientation, magnetic reconnection, aurora
 */

import type { ComprehensiveSpaceWeatherData } from "@shared/schema";
import type { HeliosingerData } from "./heliosinger-mapping";

// ============================================================================
// TYPES
// ============================================================================

export type InsightTrack = "space-weather" | "acoustics" | "electromagnetism";
export type InsightPriority = "ambient" | "notable" | "significant" | "breakthrough";

export interface EducationalInsight {
  id: string;
  track: InsightTrack;
  priority: InsightPriority;
  headline: string;          // Short punchy title (e.g., "SOUTHWARD RECONNECTION")
  explanation: string;       // The "why" explanation (2-3 sentences)
  dataConnection: string;    // How this connects to current data (e.g., "Bz is -8.2 nT right now")
  soundConnection?: string;  // How this affects what you hear (optional)
  duration: number;          // How long to show (ms)
  cooldownKey: string;       // Prevent showing same insight too often
}

export interface NarratorState {
  currentInsight: EducationalInsight | null;
  queue: EducationalInsight[];
  cooldowns: Map<string, number>;  // cooldownKey -> timestamp when available again
  lastInsightTime: number;
  insightHistory: string[];        // Track recent insights to avoid repetition
}

// ============================================================================
// INSIGHT DEFINITIONS
// ============================================================================

// Space Weather Physics insights
const SPACE_WEATHER_INSIGHTS = {
  // Velocity-related
  highVelocity: (vel: number): EducationalInsight => ({
    id: "sw-high-vel",
    track: "space-weather",
    priority: "significant",
    headline: "HIGH-SPEED STREAM",
    explanation: "Solar wind above 600 km/s typically originates from coronal holes - regions where the Sun's magnetic field opens directly into space, letting plasma escape at tremendous speeds.",
    dataConnection: `Current velocity: ${vel.toFixed(0)} km/s - that's ${(vel / 400 * 100 - 100).toFixed(0)}% faster than typical solar wind.`,
    soundConnection: "You hear the pitch rising - faster wind creates higher fundamental frequency.",
    duration: 12000,
    cooldownKey: "high-velocity",
  }),

  velocitySurge: (oldVel: number, newVel: number): EducationalInsight => ({
    id: "sw-vel-surge",
    track: "space-weather",
    priority: "notable",
    headline: "VELOCITY SURGE DETECTED",
    explanation: "A sudden increase in solar wind speed often signals the arrival of a high-speed stream or the leading edge of a coronal mass ejection reaching L1.",
    dataConnection: `Jump from ${oldVel.toFixed(0)} to ${newVel.toFixed(0)} km/s (+${(newVel - oldVel).toFixed(0)} km/s).`,
    soundConnection: "Listen as the base pitch climbs with the accelerating plasma.",
    duration: 10000,
    cooldownKey: "vel-surge",
  }),

  // Density-related
  densitySpike: (density: number): EducationalInsight => ({
    id: "sw-density-spike",
    track: "space-weather",
    priority: "notable",
    headline: "PLASMA DENSITY SPIKE",
    explanation: "High particle density (>15 p/cm3) usually marks a compression region where faster solar wind catches up with slower wind, piling up particles like cars in traffic.",
    dataConnection: `Current density: ${density.toFixed(1)} particles per cubic centimeter.`,
    soundConnection: "Dense plasma creates richer harmonics - more particles, more sonic texture.",
    duration: 10000,
    cooldownKey: "density-spike",
  }),

  lowDensity: (density: number): EducationalInsight => ({
    id: "sw-low-density",
    track: "space-weather",
    priority: "ambient",
    headline: "RAREFIED PLASMA",
    explanation: "Very low density solar wind (<3 p/cm3) represents the fast, hot outflow from coronal holes - sparse but energetic.",
    dataConnection: `Just ${density.toFixed(1)} particles per cm3 - nearly empty space carrying enormous energy.`,
    soundConnection: "The vowel opens toward 'ah' - sparse plasma creates a clearer, more open sound.",
    duration: 8000,
    cooldownKey: "low-density",
  }),

  // Kp-related
  stormConditions: (kp: number): EducationalInsight => ({
    id: "sw-storm",
    track: "space-weather",
    priority: "breakthrough",
    headline: "GEOMAGNETIC STORM",
    explanation: "Kp >= 5 indicates a geomagnetic storm. Earth's magnetic field is being significantly disturbed by the solar wind-magnetosphere coupling. Auroras expand toward lower latitudes.",
    dataConnection: `Kp index: ${kp.toFixed(1)} - storm threshold exceeded.`,
    soundConnection: "Storms add tremolo to the voice - the rhythmic pulsing you hear reflects geomagnetic oscillations.",
    duration: 15000,
    cooldownKey: "storm",
  }),

  activeConditions: (kp: number): EducationalInsight => ({
    id: "sw-active",
    track: "space-weather",
    priority: "notable",
    headline: "RISING ACTIVITY",
    explanation: "Kp of 4 signals unsettled to active conditions. The magnetosphere is responding to enhanced solar wind coupling, though not yet at storm levels.",
    dataConnection: `Kp: ${kp.toFixed(1)} - activity building.`,
    soundConnection: "You might notice subtle tremolo beginning - the magnetosphere is starting to respond.",
    duration: 10000,
    cooldownKey: "active",
  }),
};

// Acoustics & Sound Design insights
const ACOUSTICS_INSIGHTS = {
  vowelI: (): EducationalInsight => ({
    id: "ac-vowel-i",
    track: "acoustics",
    priority: "notable",
    headline: "BRIGHT VOWEL: 'EE'",
    explanation: "The 'ee' vowel has formants (resonant peaks) at higher frequencies, created by positioning the tongue high and forward. In sonification, this maps to high energy conditions.",
    dataConnection: "Fast wind + low density + southward field = bright formants.",
    soundConnection: "Your ears perceive 'ee' because the harmonic spectrum emphasizes higher frequencies.",
    duration: 10000,
    cooldownKey: "vowel-i",
  }),

  vowelU: (): EducationalInsight => ({
    id: "ac-vowel-u",
    track: "acoustics",
    priority: "notable",
    headline: "DARK VOWEL: 'OO'",
    explanation: "The 'oo' vowel concentrates energy in lower formants - lips rounded, tongue back. This darkened timbre maps to slow, dense, quiet space weather.",
    dataConnection: "Slow wind + high density = dark, muffled formants.",
    soundConnection: "The fundamental dominates while upper harmonics recede - a 'covered' vocal quality.",
    duration: 10000,
    cooldownKey: "vowel-u",
  }),

  vowelA: (): EducationalInsight => ({
    id: "ac-vowel-a",
    track: "acoustics",
    priority: "ambient",
    headline: "OPEN VOWEL: 'AH'",
    explanation: "The 'ah' vowel is maximally open - the default relaxed position of human speech. It emerges when solar conditions are balanced and calm.",
    dataConnection: "Moderate values across all parameters produce this neutral centerpoint.",
    soundConnection: "Wide formant spacing creates that characteristic 'open' quality.",
    duration: 8000,
    cooldownKey: "vowel-a",
  }),

  chordMajor: (): EducationalInsight => ({
    id: "ac-chord-major",
    track: "acoustics",
    priority: "ambient",
    headline: "MAJOR HARMONY",
    explanation: "Major chords use frequency ratios like 4:5:6, perceived as 'bright' or 'happy' due to their consonant harmonic relationships. Calm space weather produces these stable ratios.",
    dataConnection: "Low Kp and northward Bz favor consonant chord structures.",
    soundConnection: "The intervals feel resolved and peaceful - no harmonic tension.",
    duration: 8000,
    cooldownKey: "chord-major",
  }),

  chordMinor: (): EducationalInsight => ({
    id: "ac-chord-minor",
    track: "acoustics",
    priority: "notable",
    headline: "MINOR TONALITY",
    explanation: "Minor chords have a lowered third, creating subtle dissonance that we perceive as 'sad' or 'tense'. Disturbed space weather shifts the harmony toward minor modes.",
    dataConnection: "Elevated activity introduces harmonic complexity.",
    soundConnection: "That slight melancholy you hear reflects the magnetosphere under stress.",
    duration: 10000,
    cooldownKey: "chord-minor",
  }),

  tremoloEffect: (kp: number): EducationalInsight => ({
    id: "ac-tremolo",
    track: "acoustics",
    priority: "notable",
    headline: "TREMOLO MODULATION",
    explanation: "Tremolo is rapid amplitude modulation - the volume pulsing you hear. It's mapped to the Kp index because geomagnetic storms create oscillating disturbances in Earth's field.",
    dataConnection: `Kp ${kp.toFixed(1)} drives the tremolo rate and depth.`,
    soundConnection: "Each pulse corresponds to magnetospheric stress waves.",
    duration: 10000,
    cooldownKey: "tremolo",
  }),

  binauralBeats: (): EducationalInsight => ({
    id: "ac-binaural",
    track: "acoustics",
    priority: "ambient",
    headline: "BINAURAL BEATS ACTIVE",
    explanation: "When slightly different frequencies play in each ear, your brain perceives a third 'beating' frequency. This creates the spatial, immersive quality in the soundscape.",
    dataConnection: "Southward Bz increases stereo separation and binaural width.",
    soundConnection: "The sound seems to exist inside your head rather than from speakers.",
    duration: 8000,
    cooldownKey: "binaural",
  }),
};

// Electromagnetism insights
const ELECTROMAGNETISM_INSIGHTS = {
  southwardBz: (bz: number): EducationalInsight => ({
    id: "em-south-bz",
    track: "electromagnetism",
    priority: "significant",
    headline: "SOUTHWARD IMF: RECONNECTION",
    explanation: "When the interplanetary magnetic field (IMF) points south (negative Bz), it opposes Earth's northward field. This allows magnetic reconnection - field lines merge and break, transferring solar wind energy directly into the magnetosphere.",
    dataConnection: `Bz: ${bz.toFixed(1)} nT - the magnetic shield has a crack.`,
    soundConnection: "Southward Bz widens the stereo field and adds harmonic tension.",
    duration: 15000,
    cooldownKey: "south-bz",
  }),

  northwardBz: (bz: number): EducationalInsight => ({
    id: "em-north-bz",
    track: "electromagnetism",
    priority: "ambient",
    headline: "NORTHWARD IMF: SHIELD UP",
    explanation: "Northward Bz aligns with Earth's field, creating a stable magnetic barrier. The magnetopause deflects solar wind efficiently - we're protected.",
    dataConnection: `Bz: +${bz.toFixed(1)} nT - magnetic fields aligned, minimal coupling.`,
    soundConnection: "Stable Bz produces consonant harmonies and centered stereo image.",
    duration: 8000,
    cooldownKey: "north-bz",
  }),

  bzFlipSouth: (): EducationalInsight => ({
    id: "em-bz-flip-south",
    track: "electromagnetism",
    priority: "significant",
    headline: "POLARITY FLIP: GOING SOUTH",
    explanation: "The IMF just flipped from north to south orientation. This is like opening a valve - solar wind energy that was being deflected can now pour into the magnetosphere. Watch for activity to increase.",
    dataConnection: "Bz crossed zero into negative territory.",
    soundConnection: "The harmonic center shifts - you'll hear increasing tension.",
    duration: 12000,
    cooldownKey: "bz-flip",
  }),

  bzFlipNorth: (): EducationalInsight => ({
    id: "em-bz-flip-north",
    track: "electromagnetism",
    priority: "notable",
    headline: "POLARITY FLIP: GOING NORTH",
    explanation: "The IMF returned to northward orientation. The magnetosphere can now recover - the energy pipeline from the Sun is closing.",
    dataConnection: "Bz crossed zero into positive territory.",
    soundConnection: "Harmony resolves toward major modes as conditions stabilize.",
    duration: 10000,
    cooldownKey: "bz-flip",
  }),

  auroraConditions: (kp: number, bz: number): EducationalInsight => ({
    id: "em-aurora",
    track: "electromagnetism",
    priority: "breakthrough",
    headline: "AURORA CONDITIONS",
    explanation: "Auroras form when charged particles from the solar wind spiral down Earth's magnetic field lines and excite atmospheric gases. High Kp + southward Bz = aurora expansion toward lower latitudes.",
    dataConnection: `Kp ${kp.toFixed(1)} + Bz ${bz.toFixed(1)} nT = enhanced aurora probability.`,
    soundConnection: "Storm-level activity adds that characteristic tremolo pulsing.",
    duration: 15000,
    cooldownKey: "aurora",
  }),

  magneticPressure: (density: number, vel: number, pressureNPa: number, standoff: number): EducationalInsight => ({
    id: "em-pressure",
    track: "electromagnetism",
    priority: "notable",
    headline: "DYNAMIC PRESSURE",
    explanation: `Solar wind ram pressure compresses Earth's magnetic shield. At ${pressureNPa.toFixed(2)} nPa, the magnetopause is pushed to ~${standoff.toFixed(1)} Earth radii.`,
    dataConnection: `Pressure: ${pressureNPa.toFixed(2)} nPa. Standoff: ${standoff.toFixed(1)} Rₑ (Geosync: 6.6 Rₑ).`,
    soundConnection: "Compression events thicken the harmonic texture and add urgency.",
    duration: 10000,
    cooldownKey: "pressure",
  }),

  convectionEfield: (vel: number, bz: number, ey: number): EducationalInsight => ({
    id: "em-efield",
    track: "electromagnetism",
    priority: "significant",
    headline: "CONVECTION ELECTRIC FIELD",
    explanation: "The solar wind's velocity crossed with the southward IMF creates a dawn-to-dusk electric field (Ey = V × Bz). This field drives plasma convection inside the magnetosphere, energizing the ring current and feeding substorms.",
    dataConnection: `V = ${vel.toFixed(0)} km/s, Bz = ${bz.toFixed(1)} nT → Ey ≈ ${ey.toFixed(1)} mV/m. Values above 2 mV/m signal meaningful energy input.`,
    soundConnection: "Strong Ey correlates with harmonic tension and wider stereo — more energy pouring in.",
    duration: 14000,
    cooldownKey: "efield",
  }),

  radioBlackout: (rScale: number, rLabel: string, fluxWm2: number): EducationalInsight => ({
    id: "em-radio-blackout",
    track: "space-weather",
    priority: rScale >= 3 ? "breakthrough" : "significant",
    headline: `RADIO BLACKOUT — ${rLabel}`,
    explanation: `Solar X-ray flares ionize Earth's dayside D-layer, absorbing HF radio waves. At ${rLabel} level, shortwave communications and low-frequency navigation can degrade or black out for minutes to hours.`,
    dataConnection: `X-ray flux: ${(fluxWm2 * 1e6).toFixed(1)} µW/m² (0.1–0.8 nm). NOAA threshold: ${rLabel}.`,
    soundConnection: "Flare-driven X-ray spikes add shimmer and brightness to the sonic texture.",
    duration: 14000,
    cooldownKey: "radio-blackout",
  }),
};

// ============================================================================
// NARRATOR ENGINE
// ============================================================================

const COOLDOWN_DURATION = 120000;  // 2 minutes before same insight can repeat
const MIN_INSIGHT_GAP = 8000;      // Minimum 8 seconds between any insights
const MAX_QUEUE_SIZE = 3;          // Don't queue too many insights
const HISTORY_SIZE = 20;           // Remember last 20 insights for variety

export function createNarratorState(): NarratorState {
  return {
    currentInsight: null,
    queue: [],
    cooldowns: new Map(),
    lastInsightTime: 0,
    insightHistory: [],
  };
}

function isCoolingDown(state: NarratorState, cooldownKey: string): boolean {
  const cooldownUntil = state.cooldowns.get(cooldownKey);
  if (!cooldownUntil) return false;
  return Date.now() < cooldownUntil;
}

function addCooldown(state: NarratorState, cooldownKey: string): void {
  state.cooldowns.set(cooldownKey, Date.now() + COOLDOWN_DURATION);
}

function getPriorityWeight(priority: InsightPriority): number {
  switch (priority) {
    case "breakthrough": return 4;
    case "significant": return 3;
    case "notable": return 2;
    case "ambient": return 1;
  }
}

/**
 * Analyzes current conditions and generates relevant insights
 */
export function analyzeConditions(
  current: ComprehensiveSpaceWeatherData | undefined,
  previous: ComprehensiveSpaceWeatherData | undefined,
  heliosingerData: HeliosingerData | null,
  state: NarratorState
): EducationalInsight[] {
  if (!current?.solar_wind) return [];

  const insights: EducationalInsight[] = [];
  const now = Date.now();

  const vel = current.solar_wind.velocity ?? 350;
  const prevVel = previous?.solar_wind?.velocity ?? vel;
  const density = current.solar_wind.density ?? 5;
  const prevDensity = previous?.solar_wind?.density ?? density;
  const bz = current.solar_wind.bz ?? 0;
  const prevBz = previous?.solar_wind?.bz ?? 0;
  const kp = current.k_index?.kp ?? 0;
  const prevKp = previous?.k_index?.kp ?? 0;
  // Dynamic pressure: Pdyn = 1.6726e-6 * n * v² (nPa) - NOAA standard formula
  const dynamicPressure = Math.max(0, 1.6726e-6 * density * vel * vel);
  // Magnetopause standoff: Shue et al. (1998) formula with Bz correction
  // R_mp = 10.22 × P_dyn^(-1/6) × (1 + 0.033 × Bz) Earth radii
  const standoff = dynamicPressure > 0
    ? 10.22 * Math.pow(dynamicPressure, -1/6) * (1 + 0.033 * (bz || 0))
    : 10.22;

  const vowel = heliosingerData?.vowelName;
  const chordQuality = heliosingerData?.chordQuality?.name;

  // ========== SPACE WEATHER INSIGHTS ==========

  // High velocity stream
  if (vel > 600 && !isCoolingDown(state, "high-velocity")) {
    insights.push(SPACE_WEATHER_INSIGHTS.highVelocity(vel));
  }

  // Velocity surge
  if (vel - prevVel > 50 && prevVel > 0 && !isCoolingDown(state, "vel-surge")) {
    insights.push(SPACE_WEATHER_INSIGHTS.velocitySurge(prevVel, vel));
  }

  // Density spike
  if (density > 15 && !isCoolingDown(state, "density-spike")) {
    insights.push(SPACE_WEATHER_INSIGHTS.densitySpike(density));
  }

  // Low density
  if (density < 3 && density > 0 && !isCoolingDown(state, "low-density")) {
    insights.push(SPACE_WEATHER_INSIGHTS.lowDensity(density));
  }

  // Storm conditions
  if (kp >= 5 && !isCoolingDown(state, "storm")) {
    insights.push(SPACE_WEATHER_INSIGHTS.stormConditions(kp));
  }

  // Active conditions (rising Kp)
  if (kp >= 4 && kp < 5 && prevKp < 4 && !isCoolingDown(state, "active")) {
    insights.push(SPACE_WEATHER_INSIGHTS.activeConditions(kp));
  }

  // ========== ELECTROMAGNETISM INSIGHTS ==========

  // Southward Bz (strong)
  if (bz < -5 && !isCoolingDown(state, "south-bz")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.southwardBz(bz));
  }

  // Northward Bz (stable)
  if (bz > 3 && !isCoolingDown(state, "north-bz")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.northwardBz(bz));
  }

  // Bz polarity flip
  if (prevBz >= 0 && bz < 0 && !isCoolingDown(state, "bz-flip")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.bzFlipSouth());
  } else if (prevBz < 0 && bz >= 0 && !isCoolingDown(state, "bz-flip")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.bzFlipNorth());
  }

  // Aurora conditions
  if (kp >= 5 && bz < -3 && !isCoolingDown(state, "aurora")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.auroraConditions(kp, bz));
  }

  // Dynamic pressure
  if (dynamicPressure >= 3 && !isCoolingDown(state, "pressure")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.magneticPressure(density, vel, dynamicPressure, standoff));
  }

  // Convection electric field
  const bzSouth = Math.max(0, -bz);
  const ey = vel * bzSouth * 0.001; // mV/m
  if (ey >= 2 && !isCoolingDown(state, "efield")) {
    insights.push(ELECTROMAGNETISM_INSIGHTS.convectionEfield(vel, bz, ey));
  }

  // R-scale radio blackout
  const longWave = current.xray_flux?.long_wave;
  if (longWave && longWave > 0) {
    let rScale = 0;
    let rLabel = "R0";
    if (longWave >= 2e-3)      { rScale = 5; rLabel = "R5"; }
    else if (longWave >= 1e-3) { rScale = 4; rLabel = "R4"; }
    else if (longWave >= 1e-4) { rScale = 3; rLabel = "R3"; }
    else if (longWave >= 5e-5) { rScale = 2; rLabel = "R2"; }
    else if (longWave >= 1e-5) { rScale = 1; rLabel = "R1"; }
    if (rScale >= 1 && !isCoolingDown(state, "radio-blackout")) {
      insights.push(ELECTROMAGNETISM_INSIGHTS.radioBlackout(rScale, rLabel, longWave));
    }
  }

  // ========== ACOUSTICS INSIGHTS ==========

  // Vowel insights (only when vowel is stable for a moment)
  if (vowel === "I" && !isCoolingDown(state, "vowel-i")) {
    insights.push(ACOUSTICS_INSIGHTS.vowelI());
  } else if (vowel === "U" && !isCoolingDown(state, "vowel-u")) {
    insights.push(ACOUSTICS_INSIGHTS.vowelU());
  } else if (vowel === "A" && !isCoolingDown(state, "vowel-a")) {
    insights.push(ACOUSTICS_INSIGHTS.vowelA());
  }

  // Chord quality insights
  if (chordQuality?.includes("Major") && !isCoolingDown(state, "chord-major")) {
    insights.push(ACOUSTICS_INSIGHTS.chordMajor());
  } else if (chordQuality?.includes("Minor") && !isCoolingDown(state, "chord-minor")) {
    insights.push(ACOUSTICS_INSIGHTS.chordMinor());
  }

  // Tremolo insight
  if (heliosingerData?.tremoloDepth && heliosingerData.tremoloDepth > 0.2 && !isCoolingDown(state, "tremolo")) {
    insights.push(ACOUSTICS_INSIGHTS.tremoloEffect(kp));
  }

  // Binaural insight
  if (heliosingerData?.binauralMix && heliosingerData.binauralMix > 0.1 && !isCoolingDown(state, "binaural")) {
    insights.push(ACOUSTICS_INSIGHTS.binauralBeats());
  }

  // Sort by priority (highest first)
  insights.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

  // Filter out recently shown
  return insights.filter(i => !state.insightHistory.includes(i.id));
}

/**
 * Main update function - call this on each data update
 */
export function updateNarrator(
  current: ComprehensiveSpaceWeatherData | undefined,
  previous: ComprehensiveSpaceWeatherData | undefined,
  heliosingerData: HeliosingerData | null,
  state: NarratorState
): NarratorState {
  const now = Date.now();
  const newState = { ...state };

  // Analyze for new insights
  const newInsights = analyzeConditions(current, previous, heliosingerData, state);

  // Add high-priority insights to queue (don't overflow)
  for (const insight of newInsights) {
    if (newState.queue.length < MAX_QUEUE_SIZE) {
      // Don't add if already in queue
      if (!newState.queue.find(q => q.id === insight.id)) {
        newState.queue.push(insight);
      }
    }
  }

  // Sort queue by priority
  newState.queue.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

  // Check if we can show next insight
  const timeSinceLastInsight = now - newState.lastInsightTime;
  const currentInsightDone = !newState.currentInsight ||
    (now - newState.lastInsightTime > newState.currentInsight.duration);

  if (currentInsightDone && newState.queue.length > 0 && timeSinceLastInsight >= MIN_INSIGHT_GAP) {
    const nextInsight = newState.queue.shift()!;
    newState.currentInsight = nextInsight;
    newState.lastInsightTime = now;

    // Add cooldown
    addCooldown(newState, nextInsight.cooldownKey);

    // Add to history
    newState.insightHistory = [nextInsight.id, ...newState.insightHistory].slice(0, HISTORY_SIZE);
  } else if (currentInsightDone) {
    newState.currentInsight = null;
  }

  return newState;
}

/**
 * Get the current insight to display (if any)
 */
export function getCurrentInsight(state: NarratorState): EducationalInsight | null {
  if (!state.currentInsight) return null;

  const elapsed = Date.now() - state.lastInsightTime;
  if (elapsed > state.currentInsight.duration) {
    return null;
  }

  return state.currentInsight;
}

/**
 * Calculate progress through current insight (0-1)
 */
export function getInsightProgress(state: NarratorState): number {
  if (!state.currentInsight) return 0;
  const elapsed = Date.now() - state.lastInsightTime;
  return Math.min(1, elapsed / state.currentInsight.duration);
}

/**
 * Force show a specific insight (for testing or manual triggers)
 */
export function forceInsight(state: NarratorState, insight: EducationalInsight): NarratorState {
  return {
    ...state,
    currentInsight: insight,
    lastInsightTime: Date.now(),
  };
}
