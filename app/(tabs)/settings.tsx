import { Ionicons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import {
  card,
  radii,
  spacing,
  tabular,
  type as typeTokens,
  type ThemeColors,
  type ThemeMode,
} from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { PressableScale } from "../../components/ui/PressableScale";
import { useTheme, useThemedStyles } from "../../components/ThemeProvider";
import {
  cancelDailyReminder,
  getDailyReminderTime,
  setDailyReminder,
} from "../../lib/notifications";
import { computeGoals } from "../../lib/goalCalculator";
import { clearCachedThemeMode } from "../../lib/themeCache";

// A cut or bulk with no saved pace defaults here, matching onboarding's
// starting pick. The full pace control lives in "Edit profile answers".
const DEFAULT_RATE_LBS_PER_WEEK = 1;

const DIRECTIONS = ["cut", "maintain", "bulk"] as const;
const DIRECTION_LABELS: Record<(typeof DIRECTIONS)[number], string> = {
  cut: "Cut",
  maintain: "Maintain",
  bulk: "Bulk",
};
const REMINDER_TIMES = [
  { hour: 8, label: "8 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 20, label: "8 PM" },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];
const THEME_HINT: Record<ThemeMode, string> = {
  light: "Warm paper",
  dark: "Warm charcoal",
};

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const profile = useQuery(api.profile.get, {});
  const account = useQuery(api.users.current, {});
  const weightLogs = useQuery(api.weightLogs.list, {});
  const upsertProfile = useMutation(api.profile.upsert);

  const [calorieGoal, setCalorieGoal] = useState("2000");
  const [proteinGoalG, setProteinGoalG] = useState("150");
  const [carbsGoalG, setCarbsGoalG] = useState("250");
  const [fatGoalG, setFatGoalG] = useState("70");
  const [goalDirection, setGoalDirection] =
    useState<(typeof DIRECTIONS)[number]>("maintain");

  const latestWeightLbs =
    weightLogs && weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightLbs
      : undefined;

  const rate = profile?.rateLbsPerWeek || DEFAULT_RATE_LBS_PER_WEEK;

  // Switching cut / maintain / bulk repoints the daily calorie and macro
  // targets, so the numbers always match the direction instead of going stale.
  // Needs a complete profile (sex, age, height, activity, a logged weight); an
  // account that only ever used Settings keeps manual entry.
  const pickDirection = (direction: (typeof DIRECTIONS)[number]) => {
    setGoalDirection(direction);
    if (
      !profile?.sex ||
      !profile?.age ||
      !profile?.heightCm ||
      !profile?.activityLevel ||
      latestWeightLbs === undefined
    ) {
      return;
    }
    const goals = computeGoals({
      sex: profile.sex,
      age: profile.age,
      heightCm: profile.heightCm,
      currentWeightLbs: latestWeightLbs,
      activityLevel: profile.activityLevel,
      goalDirection: direction,
      rateLbsPerWeek: direction === "maintain" ? 0 : rate,
    });
    setCalorieGoal(String(goals.calorieGoal));
    setProteinGoalG(String(goals.proteinGoalG));
    setCarbsGoalG(String(goals.carbsGoalG));
    setFatGoalG(String(goals.fatGoalG));
  };

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(19);

  useEffect(() => {
    if (!profile) return;
    setCalorieGoal(String(profile.calorieGoal));
    setProteinGoalG(String(profile.proteinGoalG));
    setCarbsGoalG(String(profile.carbsGoalG));
    setFatGoalG(String(profile.fatGoalG));
    setGoalDirection(profile.goalDirection);
  }, [profile]);

  useEffect(() => {
    getDailyReminderTime().then((time) => {
      if (time) {
        setReminderEnabled(true);
        setReminderHour(time.hour);
      }
    });
  }, []);

  const toggleReminder = async (enabled: boolean) => {
    if (enabled) {
      if (Platform.OS === "web") {
        Alert.alert(
          "Not available",
          "Reminders need a phone. This isn't supported in the web preview.",
        );
        return;
      }
      // Without this catch the switch silently snaps back with no
      // explanation whenever scheduling throws on device.
      try {
        const granted = await setDailyReminder(reminderHour, 0);
        if (!granted) {
          Alert.alert(
            "Permission needed",
            "Allow notifications to set a reminder.",
          );
          return;
        }
        setReminderEnabled(true);
      } catch (error) {
        Alert.alert(
          "Couldn't set the reminder",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    } else {
      try {
        await cancelDailyReminder();
        setReminderEnabled(false);
      } catch (error) {
        Alert.alert(
          "Couldn't turn the reminder off",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  };

  const changeReminderTime = async (hour: number) => {
    setReminderHour(hour);
    // Rescheduling cancels the old reminder first, so a failure here leaves
    // nothing scheduled. The switch has to go back off to stay truthful.
    try {
      const granted = await setDailyReminder(hour, 0);
      if (!granted) {
        setReminderEnabled(false);
        Alert.alert(
          "Permission needed",
          "Allow notifications to set a reminder.",
        );
      }
    } catch (error) {
      setReminderEnabled(false);
      Alert.alert(
        "Couldn't change the time",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "Your data stays on this account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            // Drop the on-device theme hint so the next account on this device
            // does not inherit this one's choice as its default.
            await clearCachedThemeMode();
            await signOut();
          } catch (error) {
            Alert.alert(
              "Couldn't sign out",
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      await upsertProfile({
        calorieGoal: Number(calorieGoal),
        proteinGoalG: Number(proteinGoalG),
        carbsGoalG: Number(carbsGoalG),
        fatGoalG: Number(fatGoalG),
        goalDirection,
        // Persist the pace the recompute assumed, so re-opening onboarding or
        // this screen stays consistent with the numbers just saved.
        rateLbsPerWeek: goalDirection === "maintain" ? 0 : rate,
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

        <View style={styles.appearanceCard}>
          <View style={styles.appearanceHead}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <Text style={styles.appearanceHint}>{THEME_HINT[themeMode]}</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const on = themeMode === option.mode;
              return (
                <PressableScale
                  key={option.mode}
                  scaleTo={0.98}
                  flex={1}
                  onPress={() => setThemeMode(option.mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${option.label} theme`}
                  style={[styles.themeChip, on && styles.themeChipOn]}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      {
                        backgroundColor:
                          option.mode === "light" ? "#FFFFFF" : "#131211",
                        borderColor: on ? colors.onAccentSoft : colors.border,
                      },
                    ]}
                  />
                  <Text
                    style={[styles.themeChipText, on && styles.themeChipTextOn]}
                  >
                    {option.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountHead}>
            <Text style={styles.eyebrow}>Account</Text>
            <Text style={styles.accountEmail}>
              {account?.email ?? "Signed in"}
            </Text>
          </View>
          <PressableScale
            scaleTo={0.99}
            style={styles.accountAction}
            onPress={() => router.push("/onboarding?edit=1")}
            accessibilityRole="button"
            accessibilityLabel="Edit profile answers"
          >
            <Text style={styles.accountActionText}>Edit profile answers</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </PressableScale>
          <PressableScale
            scaleTo={0.99}
            style={[styles.accountAction, styles.accountActionLast]}
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </PressableScale>
        </View>

        <Text style={styles.groupTitle}>Goals</Text>
        <View style={styles.directionRow}>
          {DIRECTIONS.map((direction) => (
            <Chip
              key={direction}
              label={DIRECTION_LABELS[direction]}
              selected={goalDirection === direction}
              onPress={() => pickDirection(direction)}
            />
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <Field
            label="Daily calories"
            value={calorieGoal}
            onChangeText={setCalorieGoal}
          />
          <Field
            label="Protein"
            value={proteinGoalG}
            onChangeText={setProteinGoalG}
          />
          <Field
            label="Carbs"
            value={carbsGoalG}
            onChangeText={setCarbsGoalG}
          />
          <Field label="Fat" value={fatGoalG} onChangeText={setFatGoalG} />
        </View>

        <Button label="Save goals" onPress={handleSave} />

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <Text style={styles.sectionTitle}>Daily reminder</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.background}
              ios_backgroundColor={colors.border}
            />
          </View>
          {reminderEnabled ? (
            <View style={styles.reminderTimeRow}>
              {REMINDER_TIMES.map((option) => (
                <Chip
                  key={option.hour}
                  label={option.label}
                  selected={reminderHour === option.hour}
                  onPress={() => changeReminderTime(option.hour)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.reminderHint}>
              One reminder a day, nothing else. No streak-shaming, no social
              noise.
            </Text>
          )}
        </View>
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        textAlign="right"
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: {
      padding: spacing.lg,
      gap: spacing.sm + 4,
      paddingBottom: spacing.xl,
    },
    title: { ...typeTokens.title, fontSize: 24, color: c.text },
    sectionTitle: { ...typeTokens.bodyStrong, fontSize: 15, color: c.text },
    groupTitle: {
      ...typeTokens.bodyStrong,
      fontSize: 17,
      color: c.text,
      marginTop: spacing.md,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "500",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: c.textMuted,
    },
    appearanceCard: { ...card(c), padding: spacing.md, gap: spacing.sm + 4 },
    appearanceHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    appearanceHint: { ...typeTokens.label, color: c.textMuted },
    themeRow: { flexDirection: "row", gap: spacing.sm },
    themeChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 44,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    themeChipOn: { backgroundColor: c.accent, borderColor: c.accent },
    themeSwatch: { width: 14, height: 14, borderRadius: 999, borderWidth: 1.5 },
    themeChipText: { ...typeTokens.label, color: c.text },
    themeChipTextOn: { color: c.onAccent, fontWeight: "600" },
    directionRow: { flexDirection: "row", gap: spacing.sm },
    fieldGroup: { gap: spacing.sm },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingLeft: spacing.md,
      minHeight: 52,
    },
    fieldLabel: { ...typeTokens.body, color: c.textMuted },
    input: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
      minWidth: 110,
      ...tabular,
    },
    accountCard: { ...card(c), overflow: "hidden" },
    accountHead: {
      padding: spacing.md,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    accountEmail: { ...typeTokens.body, color: c.text },
    accountAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    accountActionLast: { borderBottomWidth: 0 },
    accountActionText: { ...typeTokens.body, color: c.text },
    signOutText: { ...typeTokens.body, color: c.accent },
    reminderCard: {
      ...card(c),
      padding: spacing.md,
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    reminderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    reminderTimeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    reminderHint: { ...typeTokens.label, color: c.textMuted },
  });
