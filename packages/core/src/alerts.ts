import type {
  AlertEvaluationInput,
  AlertEvent,
  DeviceQuietHours,
} from "./contracts/types";

const DEFAULT_MIN_INTERVAL_MS = 5 * 60 * 1000;

function getHourInTimezone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  });
  return Number.parseInt(formatter.format(date), 10);
}

export function isWithinQuietHours(
  date: Date,
  quietHours: DeviceQuietHours,
  timezone: string
): boolean {
  if (!quietHours.enabled) return false;

  const hour = getHourInTimezone(date, timezone);
  const { startHour, endHour } = quietHours;

  if (startHour === endHour) {
    return true;
  }

  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }

  return hour >= startHour && hour < endHour;
}

export function evaluateAlertEvents(input: AlertEvaluationInput): AlertEvent[] {
  const now = input.now ?? new Date();
  const prefs = input.preferences;
  const timezone = input.timezone ?? "UTC";

  if (!prefs.alertsEnabled) return [];
  if (isWithinQuietHours(now, prefs.quietHours, timezone)) return [];

  if (
    input.lastNotificationAt &&
    now.getTime() - input.lastNotificationAt.getTime() < DEFAULT_MIN_INTERVAL_MS
  ) {
    return [];
  }

  const current = input.current;
  const previous = input.previous;

  const events: AlertEvent[] = [];

  const previousKp = previous?.geomagnetic?.kp ?? 0;
  const currentKp = current.geomagnetic?.kp ?? 0;
  if (previousKp < prefs.thresholds.kp && currentKp >= prefs.thresholds.kp) {
    events.push({
      id: `kp-${prefs.thresholds.kp}-${current.timestamp}`,
      type: "kp-threshold",
      title: "Geomagnetic Activity Alert",
      body: `Kp crossed ${prefs.thresholds.kp}. Current value ${currentKp.toFixed(1)}.`,
      dedupeKey: `kp-${prefs.thresholds.kp}`,
    });
  }

  const previousBz = previous?.solarWind?.bz ?? 0;
  const currentBz = current.solarWind?.bz ?? 0;
  const southThreshold = -Math.abs(prefs.thresholds.bzSouth);
  if (previousBz > southThreshold && currentBz <= southThreshold) {
    events.push({
      id: `bz-${Math.abs(southThreshold)}-${current.timestamp}`,
      type: "bz-threshold",
      title: "Southward IMF Alert",
      body: `Bz dropped below ${southThreshold.toFixed(1)} nT.`,
      dedupeKey: `bz-${Math.abs(southThreshold)}`,
    });
  }

  const flareClass = current.flare?.flareClass?.[0] ?? "A";
  const previousFlareClass = previous?.flare?.flareClass?.[0] ?? "A";
  if (
    prefs.thresholds.flareClasses.includes(flareClass) &&
    flareClass !== previousFlareClass
  ) {
    events.push({
      id: `flare-${flareClass}-${current.timestamp}`,
      type: "flare-class",
      title: "Solar Flare Alert",
      body: `${current.flare?.flareClass} flare detected (${current.flare?.rScale ?? "R0"}).`,
      dedupeKey: `flare-${flareClass}`,
    });
  }

  return events;
}
