import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

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
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0b0b0c",
    marginBottom: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  body: {
    gap: 8,
  },
});
