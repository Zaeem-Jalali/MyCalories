import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import { colors, radii, spacing, type } from "../constants/theme";
import {
  PACE_LABELS,
  WalkPace,
  caloriesBurnedWalking,
} from "../lib/exerciseCalculator";

const PACES: WalkPace[] = ["slow", "normal", "brisk"];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExerciseScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? todayKey();

  const weightLogs = useQuery(api.weightLogs.list, {});
  const todayLogs = useQuery(api.exerciseLogs.listByDate, { date });
  const createLog = useMutation(api.exerciseLogs.create);
  const removeLog = useMutation(api.exerciseLogs.remove);

  const [pace, setPace] = useState<WalkPace>("normal");
  const [duration, setDuration] = useState("30");

  const latestWeightLbs =
    weightLogs && weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightLbs
      : 160; // reasonable fallback if no weight logged yet

  const durationNum = Number(duration) || 0;
  const preview = caloriesBurnedWalking(pace, durationNum, latestWeightLbs);

  const logWalk = async () => {
    if (durationNum <= 0) {
      Alert.alert("Enter how many minutes you walked");
      return;
    }
    await createLog({
      date,
      activity: "walk",
      pace,
      durationMinutes: durationNum,
      caloriesBurned: caloriesBurnedWalking(pace, durationNum, latestWeightLbs),
    });
    setDuration("30");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Log a walk — {date}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Pace</Text>
        <View style={styles.paceRow}>
          {PACES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.paceChip, pace === p && styles.paceChipActive]}
              onPress={() => setPace(p)}
            >
              <Text
                style={[
                  styles.paceChipText,
                  pace === p && styles.paceChipTextActive,
                ]}
              >
                {PACE_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />

        <Text style={styles.previewText}>~{preview} calories burned</Text>

        <TouchableOpacity style={styles.saveButton} onPress={logWalk}>
          <Text style={styles.saveButtonText}>Add walk</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Logged today</Text>
      <FlatList
        data={todayLogs ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <Text style={styles.logText}>
              {PACE_LABELS[item.pace]} · {item.durationMinutes} min
            </Text>
            <View style={styles.logRowRight}>
              <Text style={styles.logCalories}>{item.caloriesBurned} cal</Text>
              <TouchableOpacity onPress={() => removeLog({ id: item._id })}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No walks logged for this date yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: { ...type.bodyStrong, fontSize: 18, color: colors.text },
  closeText: { color: colors.textMuted, fontWeight: "600" },
  form: { padding: spacing.lg, gap: spacing.sm },
  fieldLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.sm },
  paceRow: { gap: spacing.sm },
  paceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paceChipActive: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  paceChipText: { ...type.bodyStrong, color: colors.text },
  paceChipTextActive: { color: colors.accent },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
  },
  previewText: { ...type.body, color: colors.textMuted },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: { ...type.bodyStrong, color: colors.onAccent },
  sectionTitle: {
    ...type.title,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logText: { color: colors.text },
  logRowRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logCalories: { color: colors.textMuted },
  deleteText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  emptyText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});
