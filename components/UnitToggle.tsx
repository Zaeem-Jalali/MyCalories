import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radii, type } from "../constants/theme";

export function UnitToggle<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.text, isSelected && styles.textSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// A segmented control: a quiet surface track with a white pill marking the
// active unit. Distinct from Chip, which is for content choices, not a
// two-way unit switch.
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 3,
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  button: {
    minWidth: 52,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSelected: { backgroundColor: colors.background },
  text: { ...type.label, color: colors.textMuted },
  textSelected: { color: colors.text, fontWeight: "600" },
});
