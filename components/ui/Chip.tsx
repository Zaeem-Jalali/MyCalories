import { StyleSheet, Text } from "react-native";

import {
  radii,
  spacing,
  type as typeTokens,
  type ThemeColors,
} from "../../constants/theme";
import { useThemedStyles } from "../ThemeProvider";
import { PressableScale } from "./PressableScale";

// The one selectable-option control in the app. Goal direction, log tabs,
// activity, intensity and reminder times were four different shapes for the
// same decision; they are all this now.
export function Chip({
  label,
  selected,
  onPress,
  block = false,
  size = "md",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Full-width variant for options whose labels are long enough that a row of
  // pills would wrap badly.
  block?: boolean;
  // "sm" is the tighter chip used where five options share one row (the log
  // food modes); "md" is the default selectable option.
  size?: "sm" | "md";
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        size === "sm" ? styles.sm : styles.mdSize,
        block ? styles.block : styles.inline,
        selected && styles.selected,
      ]}
    >
      <Text
        style={[
          size === "sm" ? styles.labelSm : styles.label,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

// Selected is a solid amber fill with white text; unselected is a plain
// hairline pill on the background. No tint state, so "chosen" reads at a
// glance across a whole row.
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    chip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      justifyContent: "center",
    },
    mdSize: { paddingHorizontal: spacing.md, minHeight: 40 },
    sm: { paddingHorizontal: spacing.sm + 2, minHeight: 38 },
    inline: { alignSelf: "flex-start" },
    block: { alignSelf: "stretch", borderRadius: radii.md },
    selected: { backgroundColor: c.accent, borderColor: c.accent },
    label: { ...typeTokens.label, color: c.text },
    labelSm: { fontSize: 12.5, fontWeight: "500", color: c.text },
    labelSelected: { color: c.onAccent, fontWeight: "600" },
  });
