import { Pressable, StyleSheet, Text } from "react-native";

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
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: "#1f2937",
    alignItems: "center",
    backgroundColor: "#050505",
  },
  active: {
    backgroundColor: "#111827",
    borderTopColor: "#22d3ee",
  },
  label: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activeLabel: {
    color: "#ecfeff",
  },
});
