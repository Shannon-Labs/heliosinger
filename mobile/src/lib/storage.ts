import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  DevicePreferencesRequest,
  FlareTimelineItem,
  LearningCard,
  SpaceWeatherNowResponse,
} from "@heliosinger/core";

const KEYS = {
  now: "heliosinger.mobile.now",
  flares: "heliosinger.mobile.flares",
  learning: "heliosinger.mobile.learning",
  preferences: "heliosinger.mobile.preferences",
  installId: "heliosinger.mobile.install-id",
  pushToken: "heliosinger.mobile.push-token",
};

export async function saveNow(now: SpaceWeatherNowResponse): Promise<void> {
  await AsyncStorage.setItem(KEYS.now, JSON.stringify(now));
}

export async function loadNow(): Promise<SpaceWeatherNowResponse | null> {
  const raw = await AsyncStorage.getItem(KEYS.now);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpaceWeatherNowResponse;
  } catch {
    return null;
  }
}

export async function saveFlares(items: FlareTimelineItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.flares, JSON.stringify(items));
}

export async function loadFlares(): Promise<FlareTimelineItem[]> {
  const raw = await AsyncStorage.getItem(KEYS.flares);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FlareTimelineItem[];
  } catch {
    return [];
  }
}

export async function saveLearning(cards: LearningCard[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.learning, JSON.stringify(cards));
}

export async function loadLearning(): Promise<LearningCard[]> {
  const raw = await AsyncStorage.getItem(KEYS.learning);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LearningCard[];
  } catch {
    return [];
  }
}

export async function savePreferences(preferences: DevicePreferencesRequest): Promise<void> {
  await AsyncStorage.setItem(KEYS.preferences, JSON.stringify(preferences));
}

export async function loadPreferences(): Promise<DevicePreferencesRequest | null> {
  const raw = await AsyncStorage.getItem(KEYS.preferences);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevicePreferencesRequest;
  } catch {
    return null;
  }
}

export async function getInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.installId);
  if (existing) {
    return existing;
  }

  const generated = `hs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEYS.installId, generated);
  return generated;
}

export async function savePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.pushToken, token);
}

export async function loadPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.pushToken);
}
