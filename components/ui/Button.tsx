import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
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

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  auto: { alignSelf: "flex-start" },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inner: { minHeight: 20, justifyContent: "center" },
  label: { ...type.bodyStrong },
  labelPrimary: { color: colors.onAccent },
  labelSecondary: { color: colors.text },
});
