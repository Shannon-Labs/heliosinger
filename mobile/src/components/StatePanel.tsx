import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

type StateKind = "loading" | "error" | "empty";

interface StatePanelProps {
  kind: StateKind;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const ICON_BY_KIND: Record<StateKind, string> = {
  loading: "...",
  error: "!!",
  empty: "--",
};

export function StatePanel({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: StatePanelProps) {
  return (
    <View style={[styles.panel, compact ? styles.compactPanel : null]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{ICON_BY_KIND[kind]}</Text>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surfaceElevated,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  compactPanel: {
    paddingVertical: tokens.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  icon: {
    color: tokens.colors.accent,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.heading,
    textTransform: "uppercase",
  },
  message: {
    color: tokens.colors.textSecondary,
    ...tokens.typography.body,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.accentSoft,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  actionText: {
    color: tokens.colors.accent,
    ...tokens.typography.compact,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
