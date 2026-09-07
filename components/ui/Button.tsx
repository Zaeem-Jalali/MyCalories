import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  radii,
  spacing,
  type as typeTokens,
  type ThemeColors,
} from "../../constants/theme";
import { useTheme, useThemedStyles } from "../ThemeProvider";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "secondary";

// One button, three states that were previously undesigned: pressed (scale at
// the press token), busy (a spinner in place of the label, so the width never
// jumps), and disabled (visibly dimmed rather than silently inert).
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  accessibilityLabel,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isPrimary = variant === "primary";
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        fullWidth ? null : styles.auto,
      ]}
    >
      <View style={styles.inner}>
        {busy ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? colors.onAccent : colors.text}
          />
        ) : (
          <Text
            style={[
              styles.label,
              isPrimary ? styles.labelPrimary : styles.labelSecondary,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    base: {
      borderRadius: radii.md,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    auto: { alignSelf: "flex-start" },
    primary: { backgroundColor: c.accent },
    secondary: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    inner: { minHeight: 20, justifyContent: "center" },
    label: { ...typeTokens.bodyStrong },
    labelPrimary: { color: c.onAccent },
    labelSecondary: { color: c.text },
  });
