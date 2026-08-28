import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radii, spacing, type } from "../constants/theme";

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

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSelected: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent,
  },
  text: { ...type.label, color: colors.textMuted },
  textSelected: { color: colors.accent, fontWeight: "700" },
});
