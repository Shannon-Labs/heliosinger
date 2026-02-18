export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://heliosinger.com";

export const API_PATHS = {
  now: "/api/mobile/v1/space-weather/now",
  flares: "/api/mobile/v1/flares",
  learn: "/api/mobile/v1/learn/context",
  register: "/api/mobile/v1/devices/register",
  preferences: "/api/mobile/v1/devices/preferences",
  unregister: "/api/mobile/v1/devices/unregister",
};
