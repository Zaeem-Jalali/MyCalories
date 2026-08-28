import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import { colors, radii, spacing, type } from "../constants/theme";
import { dateFromKey, todayKey } from "../lib/dateKey";
import { Authenticated } from "convex/react";
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  type Activity,
  INTENSITIES,
  type Intensity,
  caloriesBurned,
  intensityLabel,
} from "../lib/exerciseCalculator";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dayOfWeekFor(dateKey: string): number {
  return dateFromKey(dateKey).getDay();
}

function ExerciseScreenContent() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? todayKey();
  const dayOfWeek = dayOfWeekFor(date);

  const weightLogs = useQuery(api.weightLogs.list, {});
  const todayLogs = useQuery(api.exerciseLogs.listByDate, { date });
  const plannedToday = useQuery(api.exercisePlans.listByDay, { dayOfWeek });
  const createLog = useMutation(api.exerciseLogs.create);
  const removeLog = useMutation(api.exerciseLogs.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const identifySchedule = useAction(api.vision.identifyWorkoutSchedule);
  const replacePlans = useMutation(api.exercisePlans.replaceAll);

  const [activity, setActivity] = useState<Activity>("walk");
  const [intensity, setIntensity] = useState<Intensity>("normal");
  const [duration, setDuration] = useState("30");
  const [readingSchedule, setReadingSchedule] = useState(false);
  const [loggingPlanId, setLoggingPlanId] = useState<string | null>(null);

  const latestWeightLbs =
    weightLogs && weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightLbs
      : 160; // reasonable fallback if no weight logged yet

  const durationNum = Number(duration) || 0;
  const preview = caloriesBurned(
    activity,
    intensity,
    durationNum,
    latestWeightLbs,
  );

  const logExercise = async () => {
    if (durationNum <= 0) {
      Alert.alert("Enter how many minutes you trained");
      return;
    }
    await createLog({
      date,
      activity,
      pace: intensity,
      durationMinutes: durationNum,
      caloriesBurned: caloriesBurned(
        activity,
        intensity,
        durationNum,
        latestWeightLbs,
      ),
    });
    setDuration("30");
  };

  // A planned session is a suggestion, never an automatic entry, so it takes
  // an explicit confirm before it counts against the day.
  const logPlanned = (plan: {
    _id: string;
    activity: Activity;
    intensity: Intensity;
    durationMinutes: number;
  }) => {
    const burn = caloriesBurned(
      plan.activity,
      plan.intensity,
      plan.durationMinutes,
      latestWeightLbs,
    );
    Alert.alert(
      "Log this session?",
      `${ACTIVITY_LABELS[plan.activity]}, ${plan.durationMinutes} min, about ${burn} cal.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log it",
          onPress: async () => {
            setLoggingPlanId(plan._id);
            try {
              await createLog({
                date,
                activity: plan.activity,
                pace: plan.intensity,
                durationMinutes: plan.durationMinutes,
                caloriesBurned: burn,
              });
            } catch (error) {
              Alert.alert(
                "Couldn't log it",
                error instanceof Error ? error.message : "Unknown error",
              );
            } finally {
              setLoggingPlanId(null);
            }
          },
        },
      ],
    );
  };

  const uploadSchedule = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", `Allow ${source} access to continue.`);
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReadingSchedule(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          `Upload failed (${uploadResponse.status}). Check your connection and try again.`,
        );
      }
      const { storageId } = await uploadResponse.json();

      const entries = await identifySchedule({ storageId });
      if (entries.length === 0) {
        Alert.alert(
          "Nothing readable",
          "No sessions could be read from that photo. Try a clearer shot.",
        );
        return;
      }

      // Saving replaces the whole week, and anything the model couldn't read
      // is simply absent, so the user confirms against what was actually
      // parsed rather than having their saved plan quietly overwritten.
      const summary = entries
        .map(
          (entry) =>
            `${DAY_NAMES[entry.dayOfWeek]}: ${ACTIVITY_LABELS[entry.activity]}, ${entry.durationMinutes} min`,
        )
        .join("\n");
      Alert.alert(
        "Replace your saved schedule?",
        `${summary}\n\nThis replaces every session currently saved.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            onPress: async () => {
              try {
                await replacePlans({
                  entries: entries.map((entry) => ({
                    dayOfWeek: entry.dayOfWeek,
                    activity: entry.activity,
                    durationMinutes: entry.durationMinutes,
                    intensity: entry.intensity,
                    notes: entry.notes ?? undefined,
                  })),
                });
              } catch (error) {
                Alert.alert(
                  "Couldn't save the schedule",
                  error instanceof Error ? error.message : "Unknown error",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Couldn't read the schedule",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setReadingSchedule(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Log exercise — {date}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {plannedToday && plannedToday.length > 0 ? (
          <View style={styles.plannedCard}>
            <Text style={styles.plannedTitle}>Planned for today</Text>
            {plannedToday.map((plan) => (
              <View key={plan._id} style={styles.plannedRow}>
                <View style={styles.plannedMain}>
                  <Text style={styles.plannedText}>
                    {ACTIVITY_LABELS[plan.activity]} ·{" "}
                    {plan.durationMinutes} min ·{" "}
                    {intensityLabel(plan.activity, plan.intensity)}
                  </Text>
                  {plan.notes ? (
                    <Text style={styles.plannedNotes}>{plan.notes}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[
                    styles.plannedButton,
                    loggingPlanId === plan._id && styles.plannedButtonBusy,
                  ]}
                  onPress={() => logPlanned(plan)}
                  disabled={loggingPlanId !== null}
                >
                  <Text style={styles.plannedButtonText}>
                    {loggingPlanId === plan._id
                      ? "Logging…"
                      : `Log ~${caloriesBurned(
                          plan.activity,
                          plan.intensity,
                          plan.durationMinutes,
                          latestWeightLbs,
                        )} cal`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Activity</Text>
          <View style={styles.chipWrapRow}>
            {ACTIVITIES.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, activity === a && styles.chipActive]}
                onPress={() => setActivity(a)}
              >
                <Text
                  style={[
                    styles.chipText,
                    activity === a && styles.chipTextActive,
                  ]}
                >
                  {ACTIVITY_LABELS[a]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Intensity</Text>
          <View style={styles.intensityColumn}>
            {INTENSITIES.map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, intensity === i && styles.chipActive]}
                onPress={() => setIntensity(i)}
              >
                <Text
                  style={[
                    styles.chipText,
                    intensity === i && styles.chipTextActive,
                  ]}
                >
                  {intensityLabel(activity, i)}
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

          <TouchableOpacity style={styles.saveButton} onPress={logExercise}>
            <Text style={styles.saveButtonText}>
              Add {ACTIVITY_LABELS[activity].toLowerCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.plannedTitle}>Weekly schedule</Text>
          {readingSchedule ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.emptyInlineText}>Reading your schedule…</Text>
            </View>
          ) : (
            <View style={styles.scheduleButtonRow}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => uploadSchedule("camera")}
              >
                <Text style={styles.outlineButtonText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => uploadSchedule("library")}
              >
                <Text style={styles.outlineButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Logged today</Text>
        {todayLogs === undefined ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : todayLogs.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing logged for this date yet.
          </Text>
        ) : (
          <View style={styles.logList}>
            {todayLogs.map((item) => (
              <View key={item._id} style={styles.logRow}>
                <Text style={styles.logText}>
                  {ACTIVITY_LABELS[item.activity]} ·{" "}
                  {intensityLabel(item.activity, item.pace)} ·{" "}
                  {item.durationMinutes} min
                </Text>
                <View style={styles.logRowRight}>
                  <Text style={styles.logCalories}>
                    {item.caloriesBurned} cal
                  </Text>
                  <TouchableOpacity onPress={() => removeLog({ id: item._id })}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: { paddingBottom: spacing.xl },
  plannedCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accentTint,
    gap: spacing.sm,
  },
  plannedTitle: { ...type.bodyStrong, color: colors.text },
  plannedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  plannedMain: { flex: 1, gap: 2 },
  plannedText: { ...type.body, color: colors.text },
  plannedNotes: { ...type.label, color: colors.textMuted },
  plannedButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  plannedButtonBusy: { opacity: 0.6 },
  plannedButtonText: { ...type.label, color: colors.onAccent },
  form: { padding: spacing.lg, gap: spacing.sm },
  fieldLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.sm },
  chipWrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  intensityColumn: { gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  chipText: { ...type.bodyStrong, color: colors.text },
  chipTextActive: { color: colors.accent },
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
  scheduleCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  scheduleButtonRow: { flexDirection: "row", gap: spacing.sm },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  outlineButtonText: { ...type.bodyStrong, color: colors.text },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  emptyInlineText: { color: colors.textMuted },
  sectionTitle: {
    ...type.title,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  logList: { paddingHorizontal: spacing.lg },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logText: { color: colors.text, flex: 1 },
  logRowRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logCalories: { color: colors.textMuted },
  deleteText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  emptyText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});

// Mounted only with a session: every query on this screen is account-scoped.
export default function ExerciseScreen() {
  return (
    <Authenticated>
      <ExerciseScreenContent />
    </Authenticated>
  );
}
