import type { LearningCard, SpaceWeatherNowResponse } from "./contracts/types";

export function buildLearningCards(now: SpaceWeatherNowResponse): LearningCard[] {
  const cards: LearningCard[] = [];

  const velocity = now.solarWind?.velocity ?? 0;
  const density = now.solarWind?.density ?? 0;
  const bz = now.solarWind?.bz ?? 0;
  const kp = now.geomagnetic?.kp ?? 0;

  if (velocity >= 600) {
    cards.push({
      id: "learn-high-speed-stream",
      track: "space-weather",
      priority: "significant",
      title: "High-Speed Stream",
      body: "Solar wind above ~600 km/s often comes from coronal holes where magnetic field lines are open.",
      dataConnection: `Velocity is ${velocity.toFixed(0)} km/s right now.`,
      audioConnection: "Higher flow speed pushes the ambient fundamental upward.",
    });
  }

  if (bz <= -5) {
    cards.push({
      id: "learn-southward-bz",
      track: "electromagnetism",
      priority: "significant",
      title: "Southward IMF Coupling",
      body: "Negative Bz favors magnetic reconnection, allowing more solar wind energy into the magnetosphere.",
      dataConnection: `Current Bz is ${bz.toFixed(1)} nT (southward).`,
      audioConnection: "Southward coupling increases binaural width and harmonic tension.",
    });
  }

  if (kp >= 5) {
    cards.push({
      id: "learn-kp-storm",
      track: "space-weather",
      priority: "significant",
      title: "Geomagnetic Storm",
      body: "Kp >= 5 marks storm-level geomagnetic activity, often linked to stronger auroral expansion.",
      dataConnection: `Kp is ${kp.toFixed(1)}.`,
      audioConnection: "Storm intensity increases tremolo depth and rhythmic urgency.",
    });
  }

  if (density >= 12) {
    cards.push({
      id: "learn-density-compression",
      track: "space-weather",
      priority: "notable",
      title: "Compression Region",
      body: "Elevated density suggests compressed plasma where faster wind catches slower wind.",
      dataConnection: `Density is ${density.toFixed(1)} p/cm3.`,
      audioConnection: "Higher density enriches harmonic partials and thickness.",
    });
  }

  if (now.flare && ["M", "X"].includes(now.flare.flareClass[0])) {
    cards.push({
      id: "learn-flare-radio-impact",
      track: "electromagnetism",
      priority: "significant",
      title: "Solar Flare Radio Impact",
      body: "Strong X-ray flares ionize the dayside ionosphere and can suppress HF radio propagation.",
      dataConnection: `${now.flare.flareClass}-class flare, ${now.flare.rScale} blackout scale.`,
      audioConnection: "Flare spikes brighten the sound palette and transient accent layer.",
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: "learn-calm-baseline",
      track: "acoustics",
      priority: "ambient",
      title: "Calm Baseline",
      body: "Quiet conditions create a stable sound bed, useful for hearing subtle trend changes over time.",
      dataConnection: "Current parameters are near baseline solar-wind ranges.",
      audioConnection: "Expect smoother timbre and less modulation depth.",
    });
  }

  return cards.slice(0, 6);
}
