import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

async function runHaptic(task: () => Promise<void>): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await task();
  } catch {
    // Haptic failures are non-fatal.
  }
}

export function hapticTabSwitch(): Promise<void> {
  return runHaptic(() => Haptics.selectionAsync());
}

export function hapticPrimaryAction(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticToggle(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticError(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
