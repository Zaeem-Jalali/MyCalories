import { StyleSheet, Text } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

// The one selectable-option control in the app. Goal direction, log tabs,
// activity, intensity and reminder times were four different shapes for the
// same decision; they are all this now.
export function Chip({
  label,
  selected,
  onPress,
  block = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Full-width variant for options whose labels are long enough that a row of
  // pills would wrap badly.
  block?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        block ? styles.block : styles.inline,
        selected && styles.selected,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    minHeight: 40,
  },
  inline: { alignSelf: "flex-start" },
  block: { alignSelf: "stretch", borderRadius: radii.md },
  selected: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  label: { ...type.label, color: colors.textMuted },
  labelSelected: { color: colors.accent, fontWeight: "600" },
});
