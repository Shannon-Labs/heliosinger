import type {
  FlareTimelineItem,
  SpaceWeatherCondition,
  SpaceWeatherNowResponse,
} from "./contracts/types";

const FLARE_RANK: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  M: 3,
  X: 4,
};

export function classifyFlareClass(flux: number): string {
  if (!Number.isFinite(flux) || flux <= 0) return "A";
  if (flux >= 1e-4) return "X";
  if (flux >= 1e-5) return "M";
  if (flux >= 1e-6) return "C";
  if (flux >= 1e-7) return "B";
  return "A";
}

export function deriveRScale(longWaveFlux: number): string {
  if (!Number.isFinite(longWaveFlux) || longWaveFlux <= 0) return "R0";
  if (longWaveFlux >= 5e-4) return "R5";
  if (longWaveFlux >= 1e-4) return "R4";
  if (longWaveFlux >= 5e-5) return "R3";
  if (longWaveFlux >= 1e-5) return "R2";
  if (longWaveFlux >= 1e-6) return "R1";
  return "R0";
}

export function summarizeFlareImpact(
  flareClass: string,
  rScale: string
): string {
  const rank = FLARE_RANK[(flareClass || "A")[0]] ?? 0;

  if (rank >= 4 || rScale === "R5" || rScale === "R4") {
    return "Extreme flare conditions with high probability of major HF radio disruption on the sunlit side.";
  }

  if (rank >= 3 || rScale === "R3" || rScale === "R2") {
    return "Strong flare activity may cause moderate radio blackouts and satellite communication degradation.";
  }

  if (rank >= 2 || rScale === "R1") {
    return "Minor flare activity with occasional short-lived radio absorption effects.";
  }

  return "Background solar X-ray activity with minimal operational impacts expected.";
}

export function deriveSpaceWeatherCondition(input: {
  kp?: number | null;
  velocity?: number | null;
  bz?: number | null;
}): SpaceWeatherCondition {
  const kp = input.kp ?? 0;
  const velocity = input.velocity ?? 0;
  const bz = input.bz ?? 0;

  if (kp >= 8 || velocity >= 750 || bz <= -18) return "super_extreme";
  if (kp >= 7 || velocity >= 650 || bz <= -12) return "extreme";
  if (kp >= 5 || velocity >= 560 || bz <= -8) return "storm";
  if (kp >= 3 || velocity >= 450 || bz <= -4) return "moderate";
  return "quiet";
}

export function computeStaleness(
  eventTimestamp: string,
  now: Date = new Date()
): { stale: boolean; staleSeconds: number } {
  const sourceMs = new Date(eventTimestamp).getTime();
  if (!Number.isFinite(sourceMs)) {
    return { stale: true, staleSeconds: Number.MAX_SAFE_INTEGER };
  }

  const staleSeconds = Math.max(0, Math.floor((now.getTime() - sourceMs) / 1000));
  return {
    stale: staleSeconds > 5 * 60,
    staleSeconds,
  };
}

export function buildImpactBullets(now: SpaceWeatherNowResponse): string[] {
  const bullets: string[] = [];

  const kp = now.geomagnetic?.kp ?? 0;
  if (kp >= 7) {
    bullets.push("Severe geomagnetic storm conditions are active (Kp 7+).");
  } else if (kp >= 5) {
    bullets.push("Geomagnetic storm threshold reached (Kp 5+).");
  }

  const bz = now.solarWind?.bz ?? 0;
  if (bz <= -10) {
    bullets.push("Strong southward IMF boosts magnetospheric coupling.");
  }

  const velocity = now.solarWind?.velocity ?? 0;
  if (velocity >= 600) {
    bullets.push("High-speed solar wind stream is currently impacting near-Earth space.");
  }

  if (now.flare) {
    bullets.push(now.flare.impactSummary);
  }

  if (bullets.length === 0) {
    bullets.push("Space weather remains relatively calm with low operational risk.");
  }

  return bullets;
}

export function toFlareTimelineItem(input: {
  timestamp: string;
  shortWave: number;
  longWave: number;
  flareClass?: string;
  source?: "goes" | "derived";
}): FlareTimelineItem {
  const flareClass = input.flareClass ?? classifyFlareClass(input.longWave || input.shortWave);
  const rScale = deriveRScale(input.longWave || input.shortWave);

  return {
    id: `${input.timestamp}-${flareClass}-${Math.round((input.longWave || input.shortWave) * 1e12)}`,
    timestamp: input.timestamp,
    flareClass,
    shortWave: input.shortWave,
    longWave: input.longWave,
    rScale,
    impactSummary: summarizeFlareImpact(flareClass, rScale),
    source: input.source ?? "derived",
  };
}
