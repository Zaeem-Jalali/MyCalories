import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
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
import {
  card,
  cardTight,
  colors,
  radii,
  spacing,
  tabular,
  type,
} from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { PressableScale } from "../../components/ui/PressableScale";
import { ProgressPhotos } from "../../components/ProgressPhotos";
import { UnitToggle } from "../../components/UnitToggle";
import { WeightChart } from "../../components/WeightChart";
import { todayKey } from "../../lib/dateKey";

const LBS_PER_KG = 2.20462;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export default function ProgressScreen() {
  const router = useRouter();
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

        <PressableScale
          scaleTo={0.99}
          style={styles.reportRow}
          onPress={() => router.push("/monthlyReport")}
          accessibilityRole="button"
          accessibilityLabel="Open the monthly report"
        >
          <View style={styles.reportMain}>
            <Text style={styles.reportText}>Monthly report</Text>
            <Text style={styles.reportMeta}>
              {new Date().toLocaleDateString(undefined, { month: "long" })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </PressableScale>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {latestWeight !== undefined
                ? `${round1(latestWeight)} lbs`
                : "Not set"}
            </Text>
            <Text style={styles.cardLabel}>
              {profile?.weightGoalLbs !== undefined
                ? `Goal ${round1(profile.weightGoalLbs)} lbs`
                : "No goal weight set"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{streak ?? 0}</Text>
            <Text style={styles.cardLabel}>Day streak</Text>
          </View>
        </View>

        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Log a weight</Text>
            <UnitToggle
              options={[
                { value: "lbs", label: "lbs" },
                { value: "kg", label: "kg" },
              ]}
              selected={unit}
              onSelect={setUnit}
            />
          </View>
          <View style={styles.logRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              placeholder={`Today's weight (${unit})`}
            />
            <Button
              label="Log"
              onPress={handleLog}
              fullWidth={false}
              disabled={!input.trim()}
            />
          </View>
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Weight history</Text>
          {weightLogs === undefined ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : (
            <WeightChart entries={weightLogs} />
          )}
        </View>

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
  card: { ...cardTight, flex: 1, padding: spacing.md },
  cardValue: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.6,
    color: colors.text,
    ...tabular,
  },
  cardLabel: { ...type.label, color: colors.textMuted, marginTop: 6, ...tabular },
  logCard: { ...card, padding: spacing.md, gap: spacing.sm + 2 },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyCard: { ...card, padding: spacing.md, gap: spacing.sm },
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
    minHeight: 48,
    ...tabular,
  },
  sectionTitle: { ...type.bodyStrong, fontSize: 15, color: colors.text },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  reportMain: { gap: 5 },
  reportText: { ...type.body, color: colors.text },
  reportMeta: { fontSize: 12.5, color: colors.textMuted },
  emptyText: { color: colors.textMuted },
});
