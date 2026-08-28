import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { colors } from "../../constants/theme";

const DIRECTIONS = ["cut", "maintain", "bulk"] as const;

export default function SettingsScreen() {
  const profile = useQuery(api.profile.get, {});
  const upsertProfile = useMutation(api.profile.upsert);

  const [calorieGoal, setCalorieGoal] = useState("2000");
  const [proteinGoalG, setProteinGoalG] = useState("150");
  const [carbsGoalG, setCarbsGoalG] = useState("250");
  const [fatGoalG, setFatGoalG] = useState("70");
  const [goalDirection, setGoalDirection] =
    useState<(typeof DIRECTIONS)[number]>("maintain");

  useEffect(() => {
    if (!profile) return;
    setCalorieGoal(String(profile.calorieGoal));
    setProteinGoalG(String(profile.proteinGoalG));
    setCarbsGoalG(String(profile.carbsGoalG));
    setFatGoalG(String(profile.fatGoalG));
    setGoalDirection(profile.goalDirection);
  }, [profile]);

  const handleSave = async () => {
    try {
      await upsertProfile({
        calorieGoal: Number(calorieGoal),
        proteinGoalG: Number(proteinGoalG),
        carbsGoalG: Number(carbsGoalG),
        fatGoalG: Number(fatGoalG),
        goalDirection,
        safetyFloorOverride: false,
      });
      Alert.alert("Saved", "Your goals have been updated.");
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionTitle}>Goal direction</Text>
        <View style={styles.directionRow}>
          {DIRECTIONS.map((direction) => (
            <TouchableOpacity
              key={direction}
              onPress={() => setGoalDirection(direction)}
              style={[
                styles.directionChip,
                goalDirection === direction && styles.directionChipActive,
              ]}
            >
              <Text
                style={[
                  styles.directionChipText,
                  goalDirection === direction &&
                    styles.directionChipTextActive,
                ]}
              >
                {direction}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label="Daily calorie goal"
          value={calorieGoal}
          onChangeText={setCalorieGoal}
        />
        <Field
          label="Protein goal (g)"
          value={proteinGoalG}
          onChangeText={setProteinGoalG}
        />
        <Field
          label="Carbs goal (g)"
          value={carbsGoalG}
          onChangeText={setCarbsGoalG}
        />
        <Field label="Fat goal (g)" value={fatGoalG} onChangeText={setFatGoalG} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  directionRow: { flexDirection: "row", gap: 10 },
  directionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  directionChipActive: { backgroundColor: colors.accent },
  directionChipText: {
    color: colors.text,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  directionChipTextActive: { color: colors.onAccent },
  fieldLabel: { color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: colors.onAccent, fontWeight: "700" },
});
