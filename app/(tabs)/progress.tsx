import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import { colors, radii, spacing, type } from "../../constants/theme";
import { ProgressPhotos } from "../../components/ProgressPhotos";
import { UnitToggle } from "../../components/UnitToggle";
import { WeightChart } from "../../components/WeightChart";
import { todayKey } from "../../lib/dateKey";

const LBS_PER_KG = 2.20462;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export default function ProgressScreen() {
  const weightLogs = useQuery(api.weightLogs.list, {});
  const profile = useQuery(api.profile.get, {});
  const streak = useQuery(api.streak.current, { today: todayKey() });
  const logWeight = useMutation(api.weightLogs.logWeight);

  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [input, setInput] = useState("");

  const latestWeight =
    weightLogs && weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightLbs
      : undefined;

  const handleLog = async () => {
    const value = Number(input);
    if (!value || value <= 0) {
      Alert.alert("Enter a valid weight");
      return;
    }
    const weightLbs = unit === "lbs" ? value : value * LBS_PER_KG;
    await logWeight({ date: todayKey(), weightLbs: Math.round(weightLbs * 10) / 10 });
    setInput("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progress</Text>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {latestWeight !== undefined
                ? `${round1(latestWeight)} lbs`
                : "—"}
            </Text>
            <Text style={styles.cardLabel}>
              Goal{" "}
              {profile?.weightGoalLbs !== undefined
                ? round1(profile.weightGoalLbs)
                : "—"}{" "}
              lbs
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{streak ?? 0}</Text>
            <Text style={styles.cardLabel}>Day streak</Text>
          </View>
        </View>

        <View style={styles.logCard}>
          <UnitToggle
            options={[
              { value: "lbs", label: "lbs" },
              { value: "kg", label: "kg" },
            ]}
            selected={unit}
            onSelect={setUnit}
          />
          <View style={styles.logRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              placeholder={`Today's weight (${unit})`}
            />
            <TouchableOpacity style={styles.logButton} onPress={handleLog}>
              <Text style={styles.logButtonText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Weight history</Text>
        {weightLogs === undefined ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : (
          <WeightChart entries={weightLogs} />
        )}

        <ProgressPhotos />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.display, fontSize: 24, color: colors.text },
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cardValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  cardLabel: { color: colors.textMuted, marginTop: 4 },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  logRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  logButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  logButtonText: { ...type.bodyStrong, color: colors.onAccent },
  sectionTitle: { ...type.title, color: colors.text, marginTop: spacing.xs },
  emptyText: { color: colors.textMuted },
});
