/**
 * Plasmatail-derived magnetotail metrics for Heliosinger sonification
 *
 * This module turns available solar-wind coupling inputs into a physically-inspired
 * set of magnetotail observables:
 *  - Lobe field from dynamic-pressure scaling of a quiet-time base value
 *  - Cross-tail current sheet parameters
 *  - Tail stretching index tracked over time
 *  - Substorm phase lifecycle inferred from loading + reconnection score
 */

export enum SubstormPhase {
  QUIET = "QUIET",
  GROWTH = "GROWTH",
  ONSET = "ONSET",
  EXPANSION = "EXPANSION",
  RECOVERY = "RECOVERY",
}

export interface TailDerivedMetrics {
  /** Tail lobe field magnitude estimate in nT */
  bLobe: number;
  /** Tail magnetic energy estimate in Joules */
  eTail: number;
  /** Cross-tail current-sheet density in nA/m² */
  jCross: number;
  /** Cross-tail current-sheet half-thickness in Earth radii */
  dSheet: number;
  /** Stretching index (time-integrated southward Ey during growth) */
  stretchingIndex: number;
  /** Normalized stretching index [0-1] for UI progress visuals */
  stretchingProgress: number;
  /** Current substorm phase */
  phase: SubstormPhase;
  /** Milliseconds elapsed in current phase */
  phaseElapsedMs: number;
}

export interface PlasmatailState {
  lastTimestampMs: number;
  phaseStartedMs: number;
  phase: SubstormPhase;
  stretchingIndex: number;
  loadingWindow: number;
}

interface TailCalculationInput {
  nowMs: number;
  velocity: number;
  bz: number;
  dynamicPressure: number;
  reconnectionScore?: number;
  electricFieldMvM?: number;
}

export interface TailMetricResult {
  metrics: TailDerivedMetrics;
  nextState: PlasmatailState;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ensureFinite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

const MU0 = 4 * Math.PI * 1e-7; // H/m
const EARTH_RADIUS_M = 6_371_000;
const QUIET_LOBE_FIELD_NT = 25;
const REFERENCE_DYNAMIC_PRESSURE_NPA = 2;
const TAIL_RADIUS_RE = 20;
const TAIL_HALF_LENGTH_RE = 100;
const LOBE_ENERGY_VOLUME_M3 = Math.PI * Math.pow(TAIL_RADIUS_RE * EARTH_RADIUS_M, 2) * (TAIL_HALF_LENGTH_RE * EARTH_RADIUS_M);

const QUIET_B_TESLA = QUIET_LOBE_FIELD_NT * 1e-9;
export const QUIET_TAIL_ENERGY_J = (QUIET_B_TESLA * QUIET_B_TESLA) / (2 * MU0) * LOBE_ENERGY_VOLUME_M3;

const D_SHEET_MAX_RE = 5;
const D_SHEET_MIN_RE = 0.5;
const STRETCH_FOR_MAX_THINNING = 1500;

const STRETCH_FOR_PROGRESS = 1400;

const TAIL_LOADING_WINDOW_SECONDS = 3600;
const GROWTH_EY_THRESHOLD_MVM = 0.5;
const ONSET_EY_THRESHOLD_MVM = 1.2;
const GROWTH_RECONNECTION_THRESHOLD = 0.25;
const ONSET_RECONNECTION_THRESHOLD = 0.7;
const EXPANSION_RECONNECTION_THRESHOLD = 0.45;
const RECOVERY_RECONNECTION_THRESHOLD = 0.2;
const ONSET_HOLD_MS = 90_000;

const createPlasmatailState = (): PlasmatailState => ({
  lastTimestampMs: 0,
  phaseStartedMs: 0,
  phase: SubstormPhase.QUIET,
  stretchingIndex: 0,
  loadingWindow: 0,
});

export { createPlasmatailState };

function calculateLobeField(dynamicPressure: number): number {
  const stableDynamicPressure = clamp(ensureFinite(dynamicPressure, 0), 0, 50);
  const scaled = 1 + stableDynamicPressure / REFERENCE_DYNAMIC_PRESSURE_NPA;
  return clamp(QUIET_LOBE_FIELD_NT * Math.sqrt(Math.max(0, scaled)), 5, 100);
}

function calculateLobeEnergy(bLobeNt: number): number {
  const bTesla = bLobeNt * 1e-9;
  const energyDensity = (bTesla * bTesla) / (2 * MU0); // J/m^3
  return Math.max(0, energyDensity * LOBE_ENERGY_VOLUME_M3);
}

function calculateSheetThickness(stretchingIndex: number, loadingWindow: number): number {
  const stretchFactor = clamp(stretchingIndex / STRETCH_FOR_MAX_THINNING, 0, 1);
  const windowFactor = clamp(loadingWindow / 3000, 0, 1);
  const combined = clamp(Math.max(stretchFactor, windowFactor), 0, 1);
  return clamp(D_SHEET_MAX_RE - combined * (D_SHEET_MAX_RE - D_SHEET_MIN_RE), D_SHEET_MIN_RE, D_SHEET_MAX_RE);
}

function calculateCurrentDensityApm2(bLobeNt: number, dSheetRe: number): number {
  const bTesla = bLobeNt * 1e-9;
  const dMeter = dSheetRe * EARTH_RADIUS_M;
  if (!Number.isFinite(dMeter) || dMeter <= 0) {
    return 0;
  }

  const currentDensity = (2 * bTesla) / (MU0 * dMeter); // A/m²
  return clamp(currentDensity * 1e9, 0, Number.MAX_VALUE); // nA/m²
}

function calculateGrowthIndex(
  previousIndex: number,
  electricFieldMvM: number,
  dtSeconds: number,
  inGrowth: boolean
): number {
  if (!inGrowth || dtSeconds <= 0) {
    return Math.max(0, previousIndex - dtSeconds * 0.1);
  }

  return Math.max(0, previousIndex + electricFieldMvM * dtSeconds);
}

function detectPhase(
  input: {
    nowMs: number;
    electricFieldMvM: number;
    reconnection: number;
    hasReconnection: boolean;
    state: PlasmatailState;
    dtSeconds: number;
    loadingWindow: number;
    growthWindowed: boolean;
  }
): { phase: SubstormPhase; stretchingIndex: number; phaseStartedMs: number } {
  const {
    nowMs,
    electricFieldMvM,
    reconnection,
    hasReconnection,
    state,
    dtSeconds,
    loadingWindow,
    growthWindowed,
  } = input;

  const phaseElapsedMs = nowMs - state.phaseStartedMs;
  const growthSignal = reconnection >= GROWTH_RECONNECTION_THRESHOLD && electricFieldMvM >= GROWTH_EY_THRESHOLD_MVM;
  const onsetSignal = reconnection >= ONSET_RECONNECTION_THRESHOLD && electricFieldMvM >= ONSET_EY_THRESHOLD_MVM;
  const expansionSignal = reconnection >= EXPANSION_RECONNECTION_THRESHOLD;
  const recoverySignal = reconnection <= RECOVERY_RECONNECTION_THRESHOLD;

  let phase = state.phase;
  let phaseStartedMs = state.phaseStartedMs;
  let stretchingIndex = state.stretchingIndex;

  if (!hasReconnection) {
    if (
      (phase === SubstormPhase.GROWTH || phase === SubstormPhase.ONSET || phase === SubstormPhase.EXPANSION)
      && recoverySignal
      && state.stretchingIndex <= 0.5
      && loadingWindow < 5
    ) {
      phase = SubstormPhase.RECOVERY;
      phaseStartedMs = nowMs;
    }
    if (
      (phase === SubstormPhase.RECOVERY)
      && loadingWindow < 2
      && electricFieldMvM < 0.2
      && dtSeconds > 0
      && growthWindowed
    ) {
      phase = SubstormPhase.QUIET;
      phaseStartedMs = nowMs;
      stretchingIndex = 0;
    }
    return {
      phase: phase,
      stretchingIndex,
      phaseStartedMs,
    };
  }

  if (onsetSignal && (phase !== SubstormPhase.ONSET && phase !== SubstormPhase.EXPANSION)) {
    phase = SubstormPhase.ONSET;
    phaseStartedMs = nowMs;
    stretchingIndex = 0;
    return {
      phase,
      stretchingIndex,
      phaseStartedMs,
    };
  }

  if (phase === SubstormPhase.QUIET) {
    if (growthSignal && electricFieldMvM >= GROWTH_EY_THRESHOLD_MVM) {
      phase = SubstormPhase.GROWTH;
      phaseStartedMs = nowMs;
    }
  } else if (phase === SubstormPhase.GROWTH) {
    stretchingIndex = calculateGrowthIndex(stretchingIndex, electricFieldMvM, dtSeconds, growthSignal);

    if (onsetSignal) {
      phase = SubstormPhase.ONSET;
      phaseStartedMs = nowMs;
      stretchingIndex = 0;
    } else if (electricFieldMvM < 0.2 && recoverySignal) {
      phase = SubstormPhase.RECOVERY;
      phaseStartedMs = nowMs;
      stretchingIndex = Math.max(stretchingIndex, 0);
    }
  } else if (phase === SubstormPhase.ONSET) {
    stretchingIndex = 0;

    if (phaseElapsedMs >= ONSET_HOLD_MS) {
      if (expansionSignal && electricFieldMvM > GROWTH_EY_THRESHOLD_MVM) {
        phase = SubstormPhase.EXPANSION;
      } else if (electricFieldMvM < 0.2 && recoverySignal) {
        phase = SubstormPhase.RECOVERY;
      }
      if (phase !== SubstormPhase.ONSET) {
        phaseStartedMs = nowMs;
      }
    }
  } else if (phase === SubstormPhase.EXPANSION) {
    stretchingIndex = calculateGrowthIndex(stretchingIndex, electricFieldMvM, dtSeconds, true);

    if (recoverySignal && electricFieldMvM < 0.3) {
      phase = SubstormPhase.RECOVERY;
      phaseStartedMs = nowMs;
    }
  } else if (phase === SubstormPhase.RECOVERY) {
    stretchingIndex = Math.max(0, stretchingIndex - dtSeconds * 0.15);

    if (onsetSignal) {
      phase = SubstormPhase.ONSET;
      phaseStartedMs = nowMs;
      stretchingIndex = 0;
    } else if (growthSignal && electricFieldMvM > 0.8) {
      phase = SubstormPhase.GROWTH;
      phaseStartedMs = nowMs;
    } else if (loadingWindow < 1 && electricFieldMvM < 0.2) {
      phase = SubstormPhase.QUIET;
      phaseStartedMs = nowMs;
      stretchingIndex = 0;
    }
  }

  return {
    phase,
    stretchingIndex,
    phaseStartedMs,
  };
}

export function calculateTailMetrics(
  input: TailCalculationInput,
  previousState?: PlasmatailState
): TailMetricResult {
  const state = previousState ? { ...previousState } : createPlasmatailState();
  const nowMs = Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const velocity = ensureFinite(input.velocity, 0);
  const bz = ensureFinite(input.bz, 0);
  const dynamicPressure = ensureFinite(input.dynamicPressure, 0);
  const reconnectionRaw = input.reconnectionScore;
  const hasReconnection = Number.isFinite(reconnectionRaw);
  const reconnectionScore = hasReconnection
    ? clamp(reconnectionRaw as number, 0, 1)
    : 0;

  const electricFieldMvM = input.electricFieldMvM !== undefined
    ? ensureFinite(input.electricFieldMvM, 0)
    : Math.max(0, -bz * velocity * 0.001);

  const dtSeconds = state.lastTimestampMs > 0
    ? clamp((nowMs - state.lastTimestampMs) / 1000, 0, 3600)
    : 0;

  const loadingWindowDecay = Math.exp(-dtSeconds / TAIL_LOADING_WINDOW_SECONDS);
  const loadingWindow = state.loadingWindow * loadingWindowDecay + electricFieldMvM * dtSeconds;

  const phaseResult = detectPhase({
    nowMs,
    electricFieldMvM,
    reconnection: reconnectionScore,
    hasReconnection,
    state,
    dtSeconds,
    loadingWindow,
    growthWindowed: dtSeconds > 0,
  });

  const bLobe = calculateLobeField(dynamicPressure);
  const dSheet = calculateSheetThickness(phaseResult.stretchingIndex, loadingWindow);

  const metrics: TailDerivedMetrics = {
    bLobe,
    eTail: calculateLobeEnergy(bLobe),
    jCross: calculateCurrentDensityApm2(bLobe, dSheet),
    dSheet,
    stretchingIndex: clamp(phaseResult.stretchingIndex, 0, 5000),
    stretchingProgress: clamp(phaseResult.stretchingIndex / STRETCH_FOR_PROGRESS, 0, 1),
    phase: phaseResult.phase,
    phaseElapsedMs: Math.max(0, nowMs - phaseResult.phaseStartedMs),
  };

  const nextState: PlasmatailState = {
    lastTimestampMs: nowMs,
    phaseStartedMs: phaseResult.phaseStartedMs,
    phase: phaseResult.phase,
    stretchingIndex: metrics.stretchingIndex,
    loadingWindow,
  };

  return { metrics, nextState };
}
