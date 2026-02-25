import { Pressable, StyleSheet, Text } from "react-native";
import { tokens } from "../theme/tokens";

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, active ? styles.active : null]}>
      <Text style={[styles.label, active ? styles.activeLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: 2,
    borderTopColor: tokens.colors.border,
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
  },
  active: {
    backgroundColor: tokens.colors.surfaceElevated,
    borderTopColor: tokens.colors.accent,
  },
  label: {
    color: tokens.colors.textMuted,
    ...tokens.typography.compact,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  activeLabel: {
    color: tokens.colors.textPrimary,
  },
});
