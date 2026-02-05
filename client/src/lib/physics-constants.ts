/**
 * Physics Constants for Space Weather → Audio Sonification
 *
 * All empirical constants and conversion factors used in Heliosinger
 * are centralized here with full citations to peer-reviewed sources.
 *
 * References:
 * - Shue et al. (1998). "A New Functional Form to Study the Solar Wind Control
 *   of the Magnetopause Size and Shape." J. Geophys. Res. 103(A8):17605–17618.
 * - NOAA Space Weather Prediction Center standards
 * - Kivelson & Russell (1995). Introduction to Space Physics. Cambridge University Press.
 * - Borovsky & Denton (2008). Solar wind coupling strength. J. Geophys. Res. 113:A08228.
 */

// ============================================================================
// SOLAR WIND CONVERSIONS (NOAA Standard)
// ============================================================================

/**
 * Coefficient for dynamic pressure calculation
 * Formula: P_dyn = PDYN_COEFFICIENT * n * v² (result in nPa)
 * Where: n = density (p/cm³), v = velocity (km/s)
 *
 * Derivation: 1.6726e-6 = (1.673e-27 kg × 10^6) / 1e-9
 * (proton mass × unit conversion from cm⁻³, km/s → nPa)
 */
export const PDYN_COEFFICIENT = 1.6726e-6;

/**
 * Coefficient for Alfvén speed calculation
 * Formula: Va = ALFVEN_SPEED_COEFFICIENT * BT / sqrt(n) (result in km/s)
 * Where: BT = total magnetic field (nT), n = density (p/cm³)
 *
 * Reference: NOAA space weather data standards
 */
export const ALFVEN_SPEED_COEFFICIENT = 21.8;

/**
 * Coefficient for plasma beta calculation
 * Formula: β = PLASMA_BETA_COEFFICIENT * n * T / BT² (dimensionless)
 * Where: n = density (cm⁻³), T = temperature (K), BT = total field (nT)
 *
 * Derivation: β = 2μ₀(nkT) / B² where constants collapse to 4.03e-6
 */
export const PLASMA_BETA_COEFFICIENT = 4.03e-6;

// ============================================================================
// MAGNETOSPHERE (Shue et al. 1998)
// ============================================================================

/**
 * Base magnetopause standoff distance coefficient
 * Formula: R_mp = MAGNETOPAUSE_STANDOFF_BASE × P_dyn^(-1/6) × (1 + MAGNETOPAUSE_BZ_FACTOR × Bz)
 * Result: Earth radii (Re)
 *
 * Reference: Shue et al. (1998), Equation 11
 */
export const MAGNETOPAUSE_STANDOFF_BASE = 10.22;

/**
 * Bz correction factor for magnetopause standoff
 * Accounts for magnetic field enhancement (northward Bz) or depression (southward Bz)
 *
 * Reference: Shue et al. (1998)
 */
export const MAGNETOPAUSE_BZ_FACTOR = 0.033;

/**
 * Power law exponent for dynamic pressure in magnetopause calculation
 */
export const MAGNETOPAUSE_PDYN_EXPONENT = -1 / 6;

/**
 * Geosynchronous orbit distance in Earth radii
 * Satellites at this distance are at risk when magnetopause compresses below 6.6 Re
 */
export const GEOSYNCHRONOUS_ORBIT_RE = 6.6;

// ============================================================================
// GEOMAGNETIC INDICES (NOAA Standards)
// ============================================================================

/** Kp index valid range */
export const KP_RANGE = { min: 0, max: 9 } as const;

/** Kp threshold for G1+ storm (NOAA Space Weather Scale) */
export const KP_STORM_THRESHOLD = 5;

/** Kp threshold for G4+ severe storm */
export const KP_EXTREME_THRESHOLD = 8;

/** Kp threshold for active (unsettled) conditions */
export const KP_ACTIVE_THRESHOLD = 4;

/** Kp threshold for moderate conditions */
export const KP_MODERATE_THRESHOLD = 3;

// ============================================================================
// SOLAR WIND PARAMETER RANGES (Data-Based)
// ============================================================================

/** Solar wind velocity typical ranges in km/s */
export const SOLAR_WIND_VELOCITY = {
  min: 200,     // km/s - extremely slow streams (rare)
  max: 800,     // km/s - extreme CMEs
  typical: 400, // km/s - average ambient solar wind
  fast: 600,    // km/s - high-speed stream threshold
  extreme: 700, // km/s - extreme event threshold
} as const;

/** Solar wind density typical ranges in particles/cm³ */
export const SOLAR_WIND_DENSITY = {
  min: 0.5,      // p/cm³ - coronal hole streams
  max: 50.0,     // p/cm³ - shock compression
  typical: 5.0,  // p/cm³ - average
  low: 3.0,      // p/cm³ - low density threshold
  high: 15.0,    // p/cm³ - elevated density
  spike: 25.0,   // p/cm³ - compression spike
} as const;

/** Solar wind temperature typical ranges in Kelvin */
export const SOLAR_WIND_TEMPERATURE = {
  min: 10000,    // K - cool slow wind
  max: 200000,   // K - hot streams
  typical: 50000, // K - average
  cold: 30000,   // K - cold threshold (for audio: minor quality)
  hot: 100000,   // K - hot threshold (for audio: major quality)
} as const;

// ============================================================================
// IMF & MAGNETIC FIELD PARAMETERS
// ============================================================================

/** Interplanetary Magnetic Field Bz ranges in nT */
export const IMF_BZ = {
  min: -25,              // nT - extreme southward
  max: 25,               // nT - extreme northward
  southwardThreshold: -5, // nT - reconnection begins
  strongSouthward: -10,   // nT - storm conditions
  extremeSouthward: -15,  // nT - severe storm
} as const;

/** IMF By ranges and normalization */
export const IMF_BY = {
  min: -20,           // nT
  max: 20,            // nT
  normalization: 10,  // By normalization for audio pan speed
} as const;

/** Total magnetic field (Bt) typical ranges */
export const IMF_BT = {
  min: 1,      // nT
  max: 30,     // nT (extreme events)
  typical: 5,  // nT
} as const;

// ============================================================================
// MAGNETOMETER DATA (Boulder 'H' component, NOAA)
// ============================================================================

export const MAGNETOMETER_H = {
  min: -200,  // nT (strong southward perturbation)
  max: 200,   // nT (strong northward perturbation)
} as const;

export const MAGNETOMETER_DH_DT = {
  min: 0,
  max: 50,  // nT per measurement interval - rate of change
} as const;

// ============================================================================
// PARTICLE FLUX RANGES (Logarithmic scale)
// ============================================================================

/** Proton flux at >10 MeV in particle flux units (pfu) */
export const PROTON_FLUX_10MEV = {
  min: 1,
  max: 1e5,
  alertThreshold: 10,    // pfu - NOAA S1 minor storm
  warningThreshold: 100, // pfu - NOAA S2 moderate storm
} as const;

/** Electron flux at >2 MeV */
export const ELECTRON_FLUX_2MEV = {
  min: 1e3,
  max: 1e6,
} as const;

/** X-ray flux in W/m² */
export const XRAY_FLUX = {
  min: 1e-8,
  max: 1e-3,
  cFlare: 1e-6,  // C-class flare threshold
  mFlare: 1e-5,  // M-class flare threshold
  xFlare: 1e-4,  // X-class flare threshold
} as const;

// ============================================================================
// DYNAMIC PRESSURE & SHOCK DETECTION
// ============================================================================

/** Dynamic pressure typical range in nPa */
export const DYNAMIC_PRESSURE = {
  min: 0.5,
  max: 20,
  typical: 2,
  shockThreshold: 1.5,  // Ratio threshold for detecting pressure shocks
} as const;

/** X-ray flux spike ratio threshold */
export const XRAY_SPIKE_RATIO_THRESHOLD = 2.0;

// ============================================================================
// ELECTRIC FIELD (Interplanetary)
// ============================================================================

/**
 * Unit conversion factor for interplanetary electric field
 * Ey = -Vsw × Bz × IEF_UNIT_CONVERSION (result in mV/m)
 */
export const IEF_UNIT_CONVERSION = 1e-3;

// ============================================================================
// AUDIO SONIFICATION THRESHOLDS
// ============================================================================

/**
 * Temperature threshold for major/minor chord quality
 * Above this temperature: major chords (brighter)
 * Below this temperature: minor chords (darker)
 *
 * Note: This is an aesthetic choice for perceptual variety, not a physical phenomenon
 */
export const AUDIO_TEMPERATURE_THRESHOLD = 100000; // Kelvin

/**
 * Density thresholds for chord extensions
 */
export const AUDIO_DENSITY_THRESHOLDS = {
  triad: 5,     // p/cm³ - simple triad voicing
  sixth: 10,    // p/cm³ - add 6th extension
  seventh: 20,  // p/cm³ - add 7th extension
  ninth: 35,    // p/cm³ - add 9th extension
} as const;

/**
 * Bz detuning parameters for audio
 */
export const AUDIO_BZ_DETUNE = {
  threshold: -5,      // nT - start detuning when Bz below this
  maxDetuneCents: -20, // cents - maximum detuning amount
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate dynamic pressure from solar wind parameters
 * @param density - particle density in p/cm³
 * @param velocity - solar wind velocity in km/s
 * @returns dynamic pressure in nPa
 */
export function calculateDynamicPressure(density: number, velocity: number): number {
  return PDYN_COEFFICIENT * density * velocity * velocity;
}

/**
 * Calculate Alfvén speed
 * @param totalField - total magnetic field (Bt) in nT
 * @param density - particle density in p/cm³
 * @returns Alfvén speed in km/s
 */
export function calculateAlfvenSpeed(totalField: number, density: number): number {
  if (density <= 0) return 0;
  return ALFVEN_SPEED_COEFFICIENT * totalField / Math.sqrt(density);
}

/**
 * Calculate plasma beta
 * @param density - particle density in p/cm³
 * @param temperature - temperature in Kelvin
 * @param totalField - total magnetic field in nT
 * @returns plasma beta (dimensionless)
 */
export function calculatePlasmaBeta(density: number, temperature: number, totalField: number): number {
  if (totalField <= 0) return 0;
  return PLASMA_BETA_COEFFICIENT * density * temperature / (totalField * totalField);
}

/**
 * Calculate magnetopause standoff distance using Shue et al. (1998) formula
 * @param dynamicPressure - dynamic pressure in nPa
 * @param bz - IMF Bz component in nT (optional, defaults to 0)
 * @returns standoff distance in Earth radii
 *
 * Reference: Shue et al. (1998), J. Geophys. Res. 103(A8):17605–17618
 */
export function calculateMagnetopauseStandoff(dynamicPressure: number, bz: number = 0): number {
  if (dynamicPressure <= 0) return MAGNETOPAUSE_STANDOFF_BASE;

  // Shue et al. (1998) formula: R_mp = 10.22 × P_dyn^(-1/6) × (1 + 0.033 × Bz)
  const pressureTerm = Math.pow(dynamicPressure, MAGNETOPAUSE_PDYN_EXPONENT);
  const bzCorrection = 1 + MAGNETOPAUSE_BZ_FACTOR * bz;

  return MAGNETOPAUSE_STANDOFF_BASE * pressureTerm * bzCorrection;
}

/**
 * Calculate interplanetary electric field
 * @param velocity - solar wind velocity in km/s
 * @param bz - IMF Bz in nT
 * @returns electric field in mV/m
 */
export function calculateElectricField(velocity: number, bz: number): number {
  return -velocity * bz * IEF_UNIT_CONVERSION;
}

/**
 * Check if geosynchronous orbit is at risk based on magnetopause position
 * @param standoffDistance - magnetopause standoff in Earth radii
 * @returns true if satellites at geosynchronous orbit may be exposed
 */
export function isGeosynchronousAtRisk(standoffDistance: number): boolean {
  return standoffDistance <= GEOSYNCHRONOUS_ORBIT_RE;
}
