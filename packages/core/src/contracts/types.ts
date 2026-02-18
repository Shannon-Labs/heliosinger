export type SpaceWeatherCondition =
  | "quiet"
  | "moderate"
  | "storm"
  | "extreme"
  | "super_extreme";

export interface SpaceWeatherNowResponse {
  timestamp: string;
  stale: boolean;
  staleSeconds: number;
  source: "live" | "cached";
  condition: SpaceWeatherCondition;
  solarWind: {
    timestamp: string;
    velocity: number;
    density: number;
    bz: number;
    bt?: number;
    temperature: number;
  } | null;
  geomagnetic: {
    kp: number;
    aRunning?: number;
  } | null;
  flare: {
    flareClass: string;
    shortWave: number;
    longWave: number;
    rScale: string;
    impactSummary: string;
    timestamp: string;
  } | null;
  impacts: string[];
  lastUpdatedAt: string;
}

export interface FlareTimelineItem {
  id: string;
  timestamp: string;
  flareClass: string;
  shortWave: number;
  longWave: number;
  rScale: string;
  impactSummary: string;
  source: "goes" | "derived";
}

export type LearningTrack = "space-weather" | "acoustics" | "electromagnetism";

export interface LearningCard {
  id: string;
  track: LearningTrack;
  priority: "ambient" | "notable" | "significant";
  title: string;
  body: string;
  dataConnection: string;
  audioConnection: string;
}

export interface DeviceAlertThresholds {
  kp: number;
  bzSouth: number;
  flareClasses: string[];
}

export interface DeviceQuietHours {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface DevicePreferencesRequest {
  installId: string;
  alertsEnabled: boolean;
  thresholds: DeviceAlertThresholds;
  quietHours: DeviceQuietHours;
  backgroundAudioEnabled: boolean;
  updatedAt?: string;
}

export interface DeviceRegistrationRequest {
  installId: string;
  pushToken: string;
  timezone: string;
  platform: "ios" | "android";
  appVersion?: string;
  preferences?: DevicePreferencesRequest;
}

export interface NotificationDispatchResult {
  installId: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  eventId?: string;
}

export interface AlertEvaluationInput {
  previous: SpaceWeatherNowResponse | null;
  current: SpaceWeatherNowResponse;
  preferences: DevicePreferencesRequest;
  timezone?: string;
  now?: Date;
  lastNotificationAt?: Date | null;
}

export interface AlertEvent {
  id: string;
  type: "kp-threshold" | "bz-threshold" | "flare-class";
  title: string;
  body: string;
  dedupeKey: string;
}
