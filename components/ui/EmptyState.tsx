import { StyleSheet, Text, View } from "react-native";

import {
  radii,
  spacing,
  type as typeTokens,
  type ThemeColors,
} from "../../constants/theme";
import { useThemedStyles } from "../ThemeProvider";
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.border,
    },
    message: {
      ...typeTokens.body,
      color: c.textMuted,
      textAlign: "center",
      maxWidth: 320,
    },
  });
