import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import { Button } from "./Button";

// An empty state is an invitation, not a dead end. Every "nothing here yet"
// line in the app used to stop at the sentence; each one now carries the
// first action next to it.
export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  message: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 320,
  },
});
