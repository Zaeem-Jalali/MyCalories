import { StyleSheet, View } from "react-native";

import { type ThemeColors } from "../../constants/theme";
import { useTheme, useThemedStyles } from "../ThemeProvider";

// A percentage against a goal reads faster as a track than as a fraction
// alone. Ink below the goal, danger once it is passed: semantic color only on
// genuine state, never as decoration.
export function ProgressTrack({
  value,
  goal,
  color,
  height = 6,
  semantic = false,
}: {
  value: number;
  goal: number;
  // Defaults to the theme's ink.
  color?: string;
  height?: number;
  // Only the calorie track flips to danger when the goal is passed. Macro
  // tracks keep their own colour: the macro palette is already close to the
  // danger red, so switching there would make "over on carbs" and "protein"
  // read as the same signal.
  semantic?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ratio = goal > 0 ? value / goal : 0;
  const over = semantic && ratio > 1;
  const width = `${Math.min(100, Math.max(0, ratio * 100))}%` as const;

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: goal, now: value }}
    >
      <View
        style={[
          styles.fill,
          {
            width,
            borderRadius: height / 2,
            backgroundColor: over ? colors.danger : (color ?? colors.text),
          },
        ]}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    track: { width: "100%", backgroundColor: c.track, overflow: "hidden" },
    fill: { height: "100%" },
  });
