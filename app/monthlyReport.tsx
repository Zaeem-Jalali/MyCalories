import { Ionicons } from "@expo/vector-icons";
import { Authenticated, useAction, useQuery } from "convex/react";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

import { WeightChart } from "../components/WeightChart";
import { api } from "../convex/_generated/api";
import { colors, radii, spacing, tabular, type } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { PressableScale } from "../components/ui/PressableScale";
import { todayKey } from "../lib/dateKey";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Insights = {
  keepGoing: string[];
  considerLimiting: string[];
  summary: string;
};

function MonthlyReportContent() {
  const router = useRouter();
  const today = todayKey();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));

  const report = useQuery(api.monthlyReport.summary, { year, month, today });
  const generateInsights = useAction(api.monthlyReport.generateInsights);

  // Tagged with the month it was written for, so a review that lands after
  // the user has stepped to a different month is never shown against it.
  const [insights, setInsights] = useState<
    (Insights & { year: number; month: number }) | null
  >(null);
  const shownInsights =
    insights && insights.year === year && insights.month === month
      ? insights
      : null;
  const [thinking, setThinking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef<View>(null);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setInsights(null);
  };

  const isCurrentMonth =
    year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7));

  const readReview = async () => {
    const requestedYear = year;
    const requestedMonth = month;
    setThinking(true);
    try {
      const result = await generateInsights({
        year: requestedYear,
        month: requestedMonth,
        today,
      });
      setInsights({ ...result, year: requestedYear, month: requestedMonth });
    } catch (error) {
      Alert.alert(
        "Couldn't write the review",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setThinking(false);
    }
  };

  const shareReport = async () => {
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Sharing isn't available",
          "This works on a phone, not in the web preview.",
        );
        return;
      }
      const uri = await captureRef(shotRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `${MONTH_NAMES[month - 1]} ${year} report`,
      });
    } catch (error) {
      Alert.alert(
        "Couldn't share the report",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </PressableScale>
        <PressableScale
          onPress={shareReport}
          disabled={sharing || !report}
          accessibilityRole="button"
          accessibilityLabel="Share this report"
          style={styles.iconButton}
        >
          <Text style={styles.shareText}>{sharing ? "Sharing…" : "Share"}</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthRow}>
          <PressableScale
            onPress={() => shiftMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </PressableScale>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          <PressableScale
            onPress={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.iconButton}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentMonth ? colors.track : colors.textMuted}
            />
          </PressableScale>
        </View>

        {report === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          // Everything inside this wrapper is what gets captured for sharing,
          // so the navigation chrome above stays out of the image.
          <ViewShot ref={shotRef} style={styles.shot}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight</Text>
              {report.weight.changeLbs === null ? (
                <Text style={styles.muted}>
                  {report.weight.series.length === 0
                    ? "No weight logged this month."
                    : "One weigh-in this month, so there is no change to show yet."}
                </Text>
              ) : (
                <>
                  <Text style={styles.bigNumber}>
                    {report.weight.changeLbs > 0 ? "+" : ""}
                    {report.weight.changeLbs}
                    <Text style={styles.bigNumberUnit}> lbs</Text>
                  </Text>
                  <Text style={styles.muted}>
                    {report.weight.firstLbs} to {report.weight.lastLbs} lbs
                  </Text>
                </>
              )}
              {/* The chart only earns its space once there is a line to draw;
                  below that it would be an empty box inside a card. */}
              {report.weight.series.length >= 2 ? (
                <WeightChart entries={report.weight.series} />
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Days logged</Text>
              <Text style={styles.bigNumber}>
                {report.adherence.daysLogged}
                <Text style={styles.bigNumberMuted}>
                  {" / "}
                  {report.adherence.daysElapsed}
                </Text>
              </Text>
              <Text style={styles.muted}>
                {report.adherence.daysMissed} day
                {report.adherence.daysMissed === 1 ? "" : "s"} missed
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What you ate most</Text>
              {report.foods.length === 0 ? (
                <Text style={styles.muted}>Nothing logged this month.</Text>
              ) : (
                report.foods.slice(0, 8).map((food) => (
                  <View key={food.name} style={styles.foodRow}>
                    <View style={styles.foodMain}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.muted}>
                        {food.timesLogged}x · {food.averageCalories} cal each
                      </Text>
                    </View>
                    <Text style={styles.muted}>{food.totalCalories} cal</Text>
                  </View>
                ))
              )}
            </View>

            {shownInsights ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>The month in short</Text>
                <Text style={styles.body}>{shownInsights.summary}</Text>
                {shownInsights.keepGoing.length > 0 ? (
                  <View style={styles.listBlock}>
                    <Text style={styles.listTitle}>Worth continuing</Text>
                    {shownInsights.keepGoing.map((item) => (
                      <Text key={item} style={styles.listItem}>
                        {item}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {shownInsights.considerLimiting.length > 0 ? (
                  <View style={styles.listBlock}>
                    <Text style={styles.listTitle}>Worth limiting</Text>
                    {shownInsights.considerLimiting.map((item) => (
                      <Text key={item} style={styles.listItem}>
                        {item}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </ViewShot>
        )}

        {report && !shownInsights ? (
          <Button
            label="Write the review"
            onPress={readReview}
            busy={thinking}
            disabled={report.foods.length === 0}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function MonthlyReportScreen() {
  return (
    <Authenticated>
      <MonthlyReportContent />
    </Authenticated>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  shareText: { ...type.bodyStrong, color: colors.accent },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthLabel: { ...type.title, color: colors.text },
  loading: { marginTop: spacing.xl },
  shot: { gap: spacing.md, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: { ...type.bodyStrong, color: colors.text },
  bigNumber: { ...type.display, ...tabular, color: colors.text, letterSpacing: -0.5 },
  bigNumberMuted: { ...type.title, ...tabular, color: colors.textMuted, fontWeight: "400" },
  bigNumberUnit: { ...type.title, color: colors.textMuted, fontWeight: "400" },
  iconButton: { padding: spacing.xs, minHeight: 40, justifyContent: "center" },
  muted: { ...type.label, color: colors.textMuted },
  foodValue: { ...type.label, ...tabular, color: colors.textMuted },
  body: { ...type.body, color: colors.text },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  foodMain: { flex: 1, gap: 2 },
  foodName: { ...type.bodyStrong, color: colors.text },
  listBlock: { marginTop: spacing.sm, gap: 2 },
  listTitle: { ...type.label, color: colors.accent },
  listItem: { ...type.body, color: colors.text },
});
