import type { SpaceWeatherNowResponse } from "@heliosinger/core";
import {
  HeliosingerAudioModule,
  type HeliosingerAudioParams,
} from "../../modules/heliosinger-audio/src";

function conditionToBeat(condition: SpaceWeatherNowResponse["condition"]): number {
  switch (condition) {
    case "super_extreme":
      return 10;
    case "extreme":
      return 8;
    case "storm":
      return 6;
    case "moderate":
      return 4;
    default:
      return 2.5;
  }
}

export function nowToAudioParams(
  now: SpaceWeatherNowResponse,
  volume: number
): HeliosingerAudioParams {
  const velocity = now.solarWind?.velocity ?? 400;
  const baseFrequency = Math.max(70, Math.min(220, velocity / 3));
  const harmonicMix = now.solarWind
    ? Math.max(0.1, Math.min(0.8, (now.solarWind.density ?? 5) / 25))
    : 0.3;

  return {
    baseFrequency,
    binauralBeatHz: conditionToBeat(now.condition),
    harmonicMix,
    volume,
  };
}

export async function startAudio(params: HeliosingerAudioParams): Promise<void> {
  await HeliosingerAudioModule.start(params);
}

export async function updateAudio(params: Partial<HeliosingerAudioParams>): Promise<void> {
  await HeliosingerAudioModule.update(params);
}

export async function pauseAudio(): Promise<void> {
  await HeliosingerAudioModule.pause();
}

export async function resumeAudio(): Promise<void> {
  await HeliosingerAudioModule.resume();
}

export async function stopAudio(): Promise<void> {
  await HeliosingerAudioModule.stop();
}

export async function setAudioVolume(volume: number): Promise<void> {
  await HeliosingerAudioModule.setVolume(volume);
}

export async function setBackgroundMode(enabled: boolean): Promise<void> {
  await HeliosingerAudioModule.setBackgroundMode(enabled);
}
