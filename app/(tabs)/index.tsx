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
  card,
  cardTight,
  colors,
  elevation,
  radii,
  spacing,
  tabular,
  type,
} from "../../constants/theme";
import {
  dateFromKey,
  formatDateLabel,
  toDateKey,
  todayKey,
} from "../../lib/dateKey";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SOURCE_LABEL: Record<string, string> = {
  photo: "photo",
  barcode: "barcode",
  manual: "manual entry",
  saved: "saved meal",
};

// The seven days of the week (Sun-Sat) that contains `anchorKey`, so the strip
// always frames the selected day and paging back a week is just moving the
// anchor.
function weekDatesFor(anchorKey: string): Date[] {
  const anchor = dateFromKey(anchorKey);
  const startOfWeek = new Date(anchor);
  startOfWeek.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function weekRangeLabel(week: Date[]): string {
  const fmt = (d: Date, withMonth: boolean) =>
    new Intl.DateTimeFormat(undefined, {
      month: withMonth ? "short" : undefined,
      day: "numeric",
    }).format(d);
  const first = week[0];
  const last = week[6];
  const sameMonth = first.getMonth() === last.getMonth();
  return `${fmt(first, true)} – ${fmt(last, !sameMonth)}`;
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
      <Text style={styles.macroValue}>{Math.round(eaten)}</Text>
      <Text style={styles.macroGoal}>of {goal} g</Text>
      <View style={styles.macroTrack}>
        <ProgressTrack value={eaten} goal={goal} color={color} height={4} />
      </View>
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
  const over = remaining < 0;
  const pct = adjustedGoal > 0 ? Math.round((eaten / adjustedGoal) * 100) : 0;
  const today = todayKey();
  const week = weekDatesFor(date);
  const atCurrentWeek = week[6] >= dateFromKey(today);

  const shiftWeek = (deltaWeeks: number) => {
    const d = dateFromKey(date);
    d.setDate(d.getDate() + deltaWeeks * 7);
    const key = toDateKey(d);
    setDate(key > today ? today : key);
  };

  if (profile === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const entryCount = logs?.length ?? 0;
  const countText =
    logs === undefined
      ? ""
      : entryCount === 0
        ? "No entries"
        : `${entryCount} ${entryCount === 1 ? "entry" : "entries"}, ${Math.round(
            eaten,
          )} kcal`;

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
              <Ionicons name="flame" size={13} color={colors.accent} />
              <Text style={styles.streakText}>
                {streak} {streak === 1 ? "day" : "days"}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.weekNav}>
          <PressableScale
            scaleTo={0.9}
            style={styles.weekArrow}
            onPress={() => shiftWeek(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </PressableScale>
          <Text style={styles.weekLabel}>{weekRangeLabel(week)}</Text>
          <PressableScale
            scaleTo={0.9}
            style={styles.weekArrow}
            onPress={() => shiftWeek(1)}
            disabled={atCurrentWeek}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={atCurrentWeek ? colors.border : colors.text}
            />
          </PressableScale>
          {date !== today ? (
            <PressableScale
              scaleTo={0.96}
              style={styles.todayButton}
              onPress={() => setDate(today)}
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </PressableScale>
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
                  style={[styles.dayLabel, selected && styles.dayLabelSelected]}
                >
                  {DAY_LABELS[d.getDay()]}
                </Text>
                <Text
                  style={[styles.dayNumber, selected && styles.dayLabelSelected]}
                >
                  {d.getDate()}
                </Text>
                {/* Today keeps a marker even when another day is selected,
                    so the strip never loses its anchor. */}
                <View
                  style={[
                    styles.dayDot,
                    isToday && !selected && styles.dayDotToday,
                    selected && styles.dayDotSelected,
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
        {totals === undefined ? (
          <View style={[styles.calorieCard, styles.calorieCardLoading]}>
            <View style={[styles.skeleton, { width: 96, height: 12 }]} />
            <View
              style={[styles.skeleton, { width: 180, height: 48, marginTop: 16 }]}
            />
            <View
              style={[styles.skeleton, { height: 6, marginTop: 22, width: "100%" }]}
            />
            <View
              style={[styles.skeleton, { width: 120, height: 12, marginTop: 18 }]}
            />
          </View>
        ) : (
          <View style={styles.calorieCard}>
            <View style={styles.calorieTopRow}>
              <Text style={styles.calorieLabel}>Eaten today</Text>
              <Text style={styles.calorieGoal}>Goal {adjustedGoal}</Text>
            </View>
            <View style={styles.calorieValueRow}>
              <Text style={styles.calorieValue}>{Math.round(eaten)}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
            <View style={styles.calorieTrack}>
              <ProgressTrack
                value={eaten}
                goal={adjustedGoal}
                color={colors.accent}
                semantic
              />
            </View>
            <View style={styles.calorieBottomRow}>
              <Text
                style={[styles.calorieRemaining, over && styles.calorieOver]}
              >
                {remaining > 0
                  ? `${remaining} left`
                  : remaining === 0
                    ? "Right on your goal"
                    : `${Math.abs(remaining)} over`}
              </Text>
              <Text style={styles.caloriePct}>{pct}% of goal</Text>
            </View>
          </View>
        )}

        <PressableScale
          style={styles.exerciseRow}
          onPress={() => router.push({ pathname: "/exercise", params: { date } })}
          accessibilityRole="button"
          accessibilityLabel="Log exercise"
        >
          <Ionicons name="walk-outline" size={18} color={colors.accent} />
          <Text style={styles.exerciseText}>
            {burned
              ? `${burned} kcal from exercise`
              : "Log today's exercise"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatDateLabel(date)}</Text>
          {countText ? (
            <Text style={styles.sectionCount}>{countText}</Text>
          ) : null}
        </View>

        {logs === undefined ? (
          // Skeletons match the loaded row geometry, so nothing jumps when
          // the real rows arrive.
          <View style={styles.logList}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.logRow}>
                <View style={[styles.logThumb, styles.skeleton]} />
                <View style={styles.logMain}>
                  <View style={[styles.skeleton, { height: 14, width: "70%" }]} />
                </View>
                <View style={[styles.skeleton, { height: 12, width: 40 }]} />
              </View>
            ))}
          </View>
        ) : logs.length === 0 ? (
          <EmptyState
            message="Nothing logged for this day yet. Photograph a plate and each item gets its own portion estimate to check."
            actionLabel="Log food"
            onAction={() =>
              router.push({ pathname: "/log", params: { date } })
            }
          />
        ) : (
          <View style={styles.logList}>
            {logs.map((log, index) => {
              const breakdown = log.ingredients?.length ?? 0;
              const source = SOURCE_LABEL[log.source] ?? log.source;
              const meta =
                breakdown > 0
                  ? `${breakdown} item${breakdown === 1 ? "" : "s"} · ${source}`
                  : source.charAt(0).toUpperCase() + source.slice(1);
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
                        style={styles.logThumb}
                      />
                    ) : (
                      <View style={[styles.logThumb, styles.logThumbEmpty]}>
                        <Ionicons
                          name="restaurant-outline"
                          size={18}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                    <View style={styles.logMain}>
                      <Text style={styles.logName}>{log.name}</Text>
                      <Text style={styles.logMeta}>{meta}</Text>
                    </View>
                    <View style={styles.logValueGroup}>
                      <Text style={styles.logCalories}>
                        {Math.round(log.calories)}
                      </Text>
                      <Text style={styles.logCaloriesUnit}>kcal</Text>
                    </View>
                  </PressableScale>
                </FadeInUp>
              );
            })}
          </View>
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
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...type.title, fontSize: 24, color: colors.text },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.accentTint,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  streakText: {
    ...type.label,
    ...tabular,
    color: colors.accent,
    fontWeight: "600",
  },

  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  weekArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: { ...type.label, ...tabular, color: colors.textMuted },
  todayButton: {
    marginLeft: "auto",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
  },
  todayButtonText: { ...type.label, color: colors.accent, fontWeight: "600" },

  dayStrip: { flexDirection: "row", gap: 4 },
  dayPill: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    minHeight: 54,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dayPillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayLabel: { fontSize: 10.5, color: colors.textMuted },
  dayLabelSelected: { color: colors.onAccent },
  dayNumber: { fontSize: 15, fontWeight: "600", color: colors.text, ...tabular },
  dayDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
    backgroundColor: colors.border,
  },
  dayDotToday: { backgroundColor: colors.accent },
  dayDotSelected: { backgroundColor: "rgba(255,255,255,0.6)" },

  calorieCard: { ...card, padding: spacing.lg, paddingBottom: spacing.md + 4 },
  calorieCardLoading: { opacity: 0.9 },
  calorieTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  calorieGoal: { ...type.label, color: colors.textMuted, ...tabular },
  calorieValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  calorieValue: { ...type.hero, color: colors.text, ...tabular },
  calorieUnit: {
    ...type.body,
    color: colors.textMuted,
    paddingBottom: 8,
  },
  calorieTrack: { marginTop: spacing.md + 4 },
  calorieBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md - 2,
  },
  calorieRemaining: {
    ...type.bodyStrong,
    fontSize: 15,
    color: colors.text,
    ...tabular,
  },
  calorieOver: { color: colors.danger },
  caloriePct: { ...type.label, color: colors.textMuted, ...tabular },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  exerciseText: { ...type.body, color: colors.text, flex: 1 },

  macroRow: { flexDirection: "row", gap: spacing.sm + 2 },
  macroCard: { ...cardTight, flex: 1, padding: spacing.sm + 4 },
  macroLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: spacing.sm + 2,
    ...tabular,
  },
  macroGoal: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
    ...tabular,
  },
  macroTrack: { marginTop: spacing.sm + 4 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.sm + 4,
  },
  sectionTitle: { ...type.bodyStrong, fontSize: 17, color: colors.text },
  sectionCount: { ...type.label, color: colors.textMuted, ...tabular },

  logList: { gap: spacing.sm },
  logRow: {
    ...cardTight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    padding: spacing.sm + 4,
  },
  logThumb: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  logThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  logMain: { flex: 1, gap: 4 },
  logName: { ...type.body, color: colors.text },
  logMeta: { fontSize: 12.5, color: colors.textMuted, ...tabular },
  logValueGroup: { alignItems: "flex-end", gap: 4 },
  logCalories: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    ...tabular,
  },
  logCaloriesUnit: { fontSize: 11, color: colors.textMuted },

  skeleton: { backgroundColor: colors.surface, borderRadius: radii.sm },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 8,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
});
