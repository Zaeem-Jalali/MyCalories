import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "../../components/ui/EmptyState";
import { FadeInUp, useBumpOnChange } from "../../components/ui/motion";
import { PressableScale } from "../../components/ui/PressableScale";
import { ProgressTrack } from "../../components/ui/ProgressTrack";
import { api } from "../../convex/_generated/api";
import {
  colors,
  elevation,
  radii,
  spacing,
  tabular,
  type,
} from "../../constants/theme";
import { formatDateLabel, toDateKey, todayKey } from "../../lib/dateKey";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {Math.round(eaten)}
        <Text style={styles.macroGoal}> / {goal}g</Text>
      </Text>
      <ProgressTrack value={eaten} goal={goal} color={color} height={4} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayKey());
  const totals = useQuery(api.foodLogs.dailyTotals, { date });
  const logs = useQuery(api.foodLogs.listByDate, { date });
  const profile = useQuery(api.profile.get, {});
  const streak = useQuery(api.streak.current, { today: todayKey() });
  const burned = useQuery(api.exerciseLogs.dailyCaloriesBurned, { date });
  const streakScale = useBumpOnChange(streak);

  const calorieGoal = profile?.calorieGoal ?? 2000;
  const adjustedGoal = calorieGoal + (burned ?? 0);
  const eaten = totals?.calories ?? 0;
  const remaining = Math.round(adjustedGoal - eaten);
  const today = todayKey();
  const week = currentWeekDates();

  if (profile === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {profile?.name ? `Hi, ${profile.name}` : "CalorieAI"}
          </Text>
          {streak !== undefined && streak > 0 ? (
            <Animated.View
              style={[styles.streakPill, { transform: [{ scale: streakScale }] }]}
              accessibilityLabel={`${streak} day streak`}
            >
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={styles.streakText}>{streak}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.dayStrip}>
          {week.map((d) => {
            const key = toDateKey(d);
            const selected = key === date;
            const isToday = key === today;
            return (
              <PressableScale
                key={key}
                scaleTo={0.94}
                style={[styles.dayPill, selected && styles.dayPillSelected]}
                onPress={() => setDate(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={formatDateLabel(key)}
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
                  ]}
                >
                  {d.getDate()}
                </Text>
                {/* Today keeps a marker even when another day is selected,
                    so the strip never loses its anchor. */}
                <View
                  style={[
                    styles.dayDot,
                    isToday && !selected && styles.dayDotToday,
                  ]}
                />
              </PressableScale>
            );
          })}
        </View>

        {/* The signature: one big honest number, the remainder stated in
            words, and a track that answers "how much of the day is left"
            before any reading happens. Everything else on the screen is
            deliberately quieter than this. */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieLabel}>Calories eaten</Text>
          <Text style={styles.calorieValue}>
            {Math.round(eaten)}
            <Text style={styles.calorieGoal}> / {adjustedGoal}</Text>
          </Text>
          <ProgressTrack
            value={eaten}
            goal={adjustedGoal}
            color={colors.accent}
            semantic
          />
          <Text style={styles.calorieRemaining}>
            {remaining > 0
              ? `${remaining} left`
              : remaining === 0
                ? "Right on your goal"
                : `${Math.abs(remaining)} over`}
            {burned ? ` · ${burned} earned back from exercise` : ""}
          </Text>
        </View>

        <PressableScale
          style={styles.exerciseRow}
          onPress={() => router.push({ pathname: "/exercise", params: { date } })}
          accessibilityRole="button"
          accessibilityLabel="Log exercise"
        >
          <Ionicons name="walk-outline" size={18} color={colors.accent} />
          <Text style={styles.exerciseText}>
            {burned ? `${burned} cal from exercise` : "Log exercise"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
          />
        </PressableScale>

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

        <Text style={styles.sectionTitle}>{formatDateLabel(date)}</Text>
        {logs === undefined ? (
          // Skeletons match the loaded row geometry, so nothing jumps when
          // the real rows arrive.
          <View>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.logRow}>
                <View style={[styles.skeleton, styles.skeletonThumb]} />
                <View style={styles.logMain}>
                  <View style={[styles.skeleton, styles.skeletonLine]} />
                </View>
                <View style={[styles.skeleton, styles.skeletonValue]} />
              </View>
            ))}
          </View>
        ) : logs.length === 0 ? (
          <EmptyState
            message="Nothing logged for this day yet."
            actionLabel="Log food"
            onAction={() =>
              router.push({ pathname: "/log", params: { date } })
            }
          />
        ) : (
          logs.map((log, index) => {
            const breakdown = log.ingredients?.length ?? 0;
            return (
              <FadeInUp key={log._id} index={index}>
              <PressableScale
                scaleTo={0.99}
                style={styles.logRow}
                onPress={() =>
                  router.push({
                    pathname: "/mealDetail",
                    params: { id: log._id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${log.name}`}
              >
                {log.photoUrl ? (
                  <Image
                    source={{ uri: log.photoUrl }}
                    style={styles.logThumbnail}
                  />
                ) : null}
                <View style={styles.logMain}>
                  <Text style={styles.logName}>{log.name}</Text>
                  {breakdown > 0 ? (
                    <Text style={styles.logMeta}>
                      {breakdown} item{breakdown === 1 ? "" : "s"}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.logCalories}>
                  {Math.round(log.calories)} cal
                </Text>
              </PressableScale>
              </FadeInUp>
            );
          })
        )}
      </ScrollView>

      <PressableScale
        scaleTo={0.92}
        style={styles.fab}
        onPress={() => router.push({ pathname: "/log", params: { date } })}
        accessibilityRole="button"
        accessibilityLabel="Log food"
      >
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </PressableScale>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 104 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...type.title, color: colors.text },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.accentTint,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  streakText: { ...type.label, ...tabular, color: colors.accent, fontWeight: "700" },
  dayStrip: { flexDirection: "row", justifyContent: "space-between" },
  dayPill: {
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.md,
    minWidth: 40,
  },
  dayPillSelected: { backgroundColor: colors.accent },
  dayLabel: { fontSize: 12, color: colors.textMuted },
  dayLabelSelected: { color: colors.onAccent },
  dayNumber: { fontSize: 15, fontWeight: "600", color: colors.text, ...tabular },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  dayDotToday: { backgroundColor: colors.accent },

  calorieCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  calorieLabel: { ...type.label, color: colors.textMuted },
  calorieValue: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
    ...tabular,
  },
  calorieGoal: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "400",
    color: colors.textMuted,
    letterSpacing: 0,
  },
  calorieRemaining: { ...type.label, ...tabular, color: colors.textMuted },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  exerciseText: { ...type.body, color: colors.text, flex: 1 },

  macroRow: { flexDirection: "row", gap: spacing.sm + 2 },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  macroLabel: { fontSize: 12, color: colors.textMuted },
  macroValue: { fontSize: 17, fontWeight: "700", color: colors.text, ...tabular },
  macroGoal: { fontSize: 12, color: colors.textMuted, fontWeight: "400" },

  sectionTitle: {
    ...type.bodyStrong,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.sm,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logThumbnail: { width: 44, height: 44, borderRadius: radii.sm + 2 },
  logMain: { flex: 1, gap: 2 },
  logName: { ...type.body, fontWeight: "500", color: colors.text },
  logMeta: { fontSize: 13, color: colors.textMuted },
  logCalories: { ...type.label, ...tabular, color: colors.textMuted },

  skeleton: { backgroundColor: colors.border, borderRadius: radii.sm },
  skeletonThumb: { width: 44, height: 44, borderRadius: radii.sm + 2 },
  skeletonLine: { height: 14, width: "70%" },
  skeletonValue: { height: 12, width: 48 },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
});
