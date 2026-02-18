import { requireOptionalNativeModule } from "expo-modules-core";

export interface HeliosingerAudioParams {
  baseFrequency: number;
  binauralBeatHz: number;
  harmonicMix: number;
  volume: number;
}

interface HeliosingerAudioNativeModule {
  start: (params: HeliosingerAudioParams) => Promise<void>;
  update: (params: Partial<HeliosingerAudioParams>) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setBackgroundMode: (enabled: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

const nativeModule = requireOptionalNativeModule<HeliosingerAudioNativeModule>("HeliosingerAudio");

const fallback: HeliosingerAudioNativeModule = {
  async start() {
    // Native module unavailable in Expo Go; dev fallback is no-op.
  },
  async update() {},
  async setVolume() {},
  async setBackgroundMode() {},
  async pause() {},
  async resume() {},
  async stop() {},
};

const HeliosingerAudioModule = nativeModule ?? fallback;

export default HeliosingerAudioModule;
