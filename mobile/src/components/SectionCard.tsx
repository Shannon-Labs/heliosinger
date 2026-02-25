import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

interface SectionCardProps extends PropsWithChildren {
  title: string;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    marginBottom: tokens.spacing.sm,
  },
  title: {
    color: tokens.colors.textPrimary,
    ...tokens.typography.heading,
    marginBottom: tokens.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  body: {
    gap: tokens.spacing.xs,
  },
});
