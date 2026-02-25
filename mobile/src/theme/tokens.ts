import { Platform } from "react-native";

const displayFont = Platform.select({
  ios: "AvenirNext-Bold",
  android: "serif",
  default: undefined,
});

const headingFont = Platform.select({
  ios: "AvenirNext-DemiBold",
  android: "sans-serif-medium",
  default: undefined,
});

const bodyFont = Platform.select({
  ios: "AvenirNext-Regular",
  android: "sans-serif",
  default: undefined,
});

export const tokens = {
  colors: {
    bg: "#030712",
    surface: "#0a1226",
    surfaceElevated: "#111a31",
    border: "#1f2b46",
    textPrimary: "#f8fafc",
    textSecondary: "#c3d4eb",
    textMuted: "#8ea7c4",
    accent: "#5eead4",
    accentSoft: "#10343f",
    good: "#22c55e",
    warning: "#f97316",
    danger: "#f43f5e",
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999,
  },
  typography: {
    display: {
      fontFamily: displayFont,
      fontSize: 23,
      fontWeight: "800" as const,
      letterSpacing: 0.8,
    },
    heading: {
      fontFamily: headingFont,
      fontSize: 15,
      fontWeight: "800" as const,
      letterSpacing: 0.4,
    },
    body: {
      fontFamily: bodyFont,
      fontSize: 13,
      lineHeight: 19,
    },
    compact: {
      fontFamily: bodyFont,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.2,
    },
  },
  motion: {
    quick: 150,
    normal: 260,
  },
} as const;
