import { useQuery } from "convex/react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { colors } from "../../constants/theme";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function MacroStat({
  label,
  eaten,
  goal,
  color,
}: {
  label: string;
  eaten: number;
  goal: number;
  color: string;
}) {
  return (
    <View style={styles.macroCard}>
      <Text style={[styles.macroValue, { color }]}>
        {Math.round(eaten)}
        <Text style={styles.macroGoal}>/{goal}g</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [date] = useState(todayKey());
  const totals = useQuery(api.foodLogs.dailyTotals, { date });
  const logs = useQuery(api.foodLogs.listByDate, { date });
  const profile = useQuery(api.profile.get, {});
  const streak = useQuery(api.streak.current, {});

  const calorieGoal = profile?.calorieGoal ?? 2000;
  const eaten = totals?.calories ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>CalorieAI</Text>
          {streak !== undefined && streak > 0 ? (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.calorieCard}>
          <View>
            <Text style={styles.calorieValue}>
              {Math.round(eaten)}
              <Text style={styles.calorieGoal}>/{calorieGoal}</Text>
            </Text>
            <Text style={styles.calorieLabel}>Calories eaten</Text>
          </View>
        </View>

        <View style={styles.macroRow}>
          <MacroStat
            label="Protein"
            eaten={totals?.proteinG ?? 0}
            goal={profile?.proteinGoalG ?? 150}
            color={colors.protein}
          />
          <MacroStat
            label="Carbs"
            eaten={totals?.carbsG ?? 0}
            goal={profile?.carbsGoalG ?? 250}
            color={colors.carbs}
          />
          <MacroStat
            label="Fat"
            eaten={totals?.fatG ?? 0}
            goal={profile?.fatGoalG ?? 70}
            color={colors.fat}
          />
        </View>

        <Text style={styles.sectionTitle}>Today&apos;s log</Text>
        {logs === undefined ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing logged yet. Food logging (photo/barcode/manual) lands in
            the next build phase.
          </Text>
        ) : (
          logs.map((log) => (
            <View key={log._id} style={styles.logRow}>
              <Text style={styles.logName}>{log.name}</Text>
              <Text style={styles.logCalories}>{log.calories} cal</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  streakPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { fontWeight: "600", color: colors.text },
  calorieCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  calorieValue: { fontSize: 36, fontWeight: "800", color: colors.text },
  calorieGoal: {
    fontSize: 18,
    fontWeight: "400",
    color: colors.textMuted,
  },
  calorieLabel: { color: colors.textMuted, marginTop: 4 },
  macroRow: { flexDirection: "row", gap: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  macroValue: { fontSize: 18, fontWeight: "700" },
  macroGoal: { fontSize: 13, color: colors.textMuted, fontWeight: "400" },
  macroLabel: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  emptyText: { color: colors.textMuted },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logName: { color: colors.text, fontWeight: "500" },
  logCalories: { color: colors.textMuted },
});
