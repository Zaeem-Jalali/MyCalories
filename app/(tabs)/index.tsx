import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { colors } from "../../constants/theme";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayKey(): string {
  return toDateKey(new Date());
}

function currentWeekDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
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
  const router = useRouter();
  const [date, setDate] = useState(todayKey());
  const totals = useQuery(api.foodLogs.dailyTotals, { date });
  const logs = useQuery(api.foodLogs.listByDate, { date });
  const profile = useQuery(api.profile.get, {});
  const streak = useQuery(api.streak.current, {});

  const calorieGoal = profile?.calorieGoal ?? 2000;
  const eaten = totals?.calories ?? 0;
  const today = todayKey();
  const week = currentWeekDates();

  if (profile === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (profile === null || !profile.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {profile?.name ? `Hi, ${profile.name}` : "CalorieAI"}
          </Text>
          {streak !== undefined && streak > 0 ? (
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.dayStrip}>
          {week.map((d) => {
            const key = toDateKey(d);
            const selected = key === date;
            const isToday = key === today;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayPill, selected && styles.dayPillSelected]}
                onPress={() => setDate(key)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    selected && styles.dayLabelSelected,
                  ]}
                >
                  {DAY_LABELS[d.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    selected && styles.dayLabelSelected,
                    isToday && !selected && styles.dayNumberToday,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
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

        <Text style={styles.sectionTitle}>Log for {date}</Text>
        {logs === undefined ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing logged for this date yet.
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: "/log", params: { date } })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentTint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { fontWeight: "600", color: colors.accent },
  dayStrip: { flexDirection: "row", justifyContent: "space-between" },
  dayPill: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    minWidth: 40,
  },
  dayPillSelected: { backgroundColor: colors.accent },
  dayLabel: { fontSize: 12, color: colors.textMuted },
  dayLabelSelected: { color: colors.onAccent },
  dayNumber: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },
  dayNumberToday: { color: colors.protein },
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
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: colors.onAccent, fontSize: 28, lineHeight: 30 },
});
