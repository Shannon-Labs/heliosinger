import type {
  DevicePreferencesRequest,
  DeviceRegistrationRequest,
} from "../contracts/types";

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationIssue[] };

const ALLOWED_FLARE_CLASSES = new Set(["A", "B", "C", "M", "X"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown, maxLen = 256): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return null;
  return trimmed;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizePlatform(value: unknown): "ios" | "android" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "ios" || normalized === "android") return normalized;
  return null;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeFlareClasses(input: unknown): string[] {
  if (!Array.isArray(input)) return ["M", "X"];
  const classes = input
    .map((value) => String(value).trim().toUpperCase()[0] ?? "")
    .filter((value) => ALLOWED_FLARE_CLASSES.has(value));
  if (classes.length === 0) return ["M", "X"];
  return [...new Set(classes)];
}

function sanitizeQuietHours(input: unknown): DevicePreferencesRequest["quietHours"] {
  const record = isRecord(input) ? input : {};
  const startHour = clamp(Math.floor(coerceNumber(record.startHour, 22)), 0, 23);
  const endHour = clamp(Math.floor(coerceNumber(record.endHour, 7)), 0, 23);
  return {
    enabled: coerceBoolean(record.enabled, false),
    startHour,
    endHour,
  };
}

function sanitizeThresholds(input: unknown): DevicePreferencesRequest["thresholds"] {
  const record = isRecord(input) ? input : {};
  return {
    kp: clamp(coerceNumber(record.kp, 5), 1, 9),
    bzSouth: clamp(coerceNumber(record.bzSouth, 8), 1, 30),
    flareClasses: normalizeFlareClasses(record.flareClasses),
  };
}

export function sanitizeFlaresLimit(raw: unknown, fallback = 50): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 1, 200);
}

export function validateDevicePreferencesRequest(
  input: unknown,
  options: { installIdRequired?: boolean } = {}
): ValidationResult<DevicePreferencesRequest> {
  const installIdRequired = options.installIdRequired ?? true;
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: "invalid_body", field: "body", message: "JSON object is required" }],
    };
  }

  const errors: ValidationIssue[] = [];
  const installId = asNonEmptyString(input.installId, 128);
  if (installIdRequired && !installId) {
    errors.push({ code: "invalid_install_id", field: "installId", message: "installId is required" });
  }

  const payload: DevicePreferencesRequest = {
    installId: installId ?? "",
    alertsEnabled: coerceBoolean(input.alertsEnabled, true),
    thresholds: sanitizeThresholds(input.thresholds),
    quietHours: sanitizeQuietHours(input.quietHours),
    backgroundAudioEnabled: coerceBoolean(input.backgroundAudioEnabled, true),
    updatedAt: asNonEmptyString(input.updatedAt, 64) ?? new Date().toISOString(),
  };

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: payload };
}

export function validateDeviceRegistrationRequest(
  input: unknown
): ValidationResult<DeviceRegistrationRequest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: "invalid_body", field: "body", message: "JSON object is required" }],
    };
  }

  const errors: ValidationIssue[] = [];

  const installId = asNonEmptyString(input.installId, 128);
  const pushToken = asNonEmptyString(input.pushToken, 512);
  const timezone = asNonEmptyString(input.timezone, 120);
  const platform = normalizePlatform(input.platform);
  const appVersion = asNonEmptyString(input.appVersion, 64) ?? undefined;

  if (!installId) {
    errors.push({ code: "invalid_install_id", field: "installId", message: "installId is required" });
  }
  if (!pushToken) {
    errors.push({ code: "invalid_push_token", field: "pushToken", message: "pushToken is required" });
  }
  if (!timezone) {
    errors.push({ code: "invalid_timezone", field: "timezone", message: "timezone is required" });
  } else if (!isValidTimezone(timezone)) {
    errors.push({ code: "invalid_timezone", field: "timezone", message: "timezone must be a valid IANA timezone" });
  }
  if (!platform) {
    errors.push({ code: "invalid_platform", field: "platform", message: "platform must be ios or android" });
  }

  let preferences: DevicePreferencesRequest | undefined;
  if (input.preferences !== undefined) {
    const validatedPreferences = validateDevicePreferencesRequest(input.preferences, {
      installIdRequired: false,
    });
    if (!validatedPreferences.ok) {
      errors.push(
        ...validatedPreferences.errors.map((issue) => ({
          ...issue,
          field: `preferences.${issue.field}`,
        }))
      );
    } else {
      preferences = {
        ...validatedPreferences.value,
        installId: installId ?? validatedPreferences.value.installId,
      };
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      installId: installId!,
      pushToken: pushToken!,
      timezone: timezone!,
      platform: platform!,
      appVersion,
      preferences,
    },
  };
}
