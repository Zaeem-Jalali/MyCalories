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
import { colors, radii, spacing, type } from "../../constants/theme";
import {
  cancelDailyReminder,
  getDailyReminderTime,
  setDailyReminder,
} from "../../lib/notifications";

const DIRECTIONS = ["cut", "maintain", "bulk"] as const;
const REMINDER_TIMES = [
  { hour: 8, label: "8 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 20, label: "8 PM" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const profile = useQuery(api.profile.get, {});
  const account = useQuery(api.users.current, {});
  const upsertProfile = useMutation(api.profile.upsert);

  const [calorieGoal, setCalorieGoal] = useState("2000");
  const [proteinGoalG, setProteinGoalG] = useState("150");
  const [carbsGoalG, setCarbsGoalG] = useState("250");
  const [fatGoalG, setFatGoalG] = useState("70");
  const [goalDirection, setGoalDirection] =
    useState<(typeof DIRECTIONS)[number]>("maintain");

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
          "Reminders need a phone — this isn't supported in the web preview.",
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

        <View style={styles.accountCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.accountEmail}>
            {account?.email ?? "Signed in"}
          </Text>
          <TouchableOpacity
            style={styles.accountAction}
            onPress={() => router.push("/onboarding?edit=1")}
          >
            <Text style={styles.accountActionText}>Edit profile answers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accountAction} onPress={confirmSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Goal direction</Text>
        <View style={styles.directionRow}>
          {DIRECTIONS.map((direction) => (
            <TouchableOpacity
              key={direction}
              onPress={() => setGoalDirection(direction)}
              style={[
                styles.directionChip,
                goalDirection === direction && styles.directionChipActive,
              ]}
            >
              <Text
                style={[
                  styles.directionChipText,
                  goalDirection === direction &&
                    styles.directionChipTextActive,
                ]}
              >
                {direction}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label="Daily calorie goal"
          value={calorieGoal}
          onChangeText={setCalorieGoal}
        />
        <Field
          label="Protein goal (g)"
          value={proteinGoalG}
          onChangeText={setProteinGoalG}
        />
        <Field
          label="Carbs goal (g)"
          value={carbsGoalG}
          onChangeText={setCarbsGoalG}
        />
        <Field label="Fat goal (g)" value={fatGoalG} onChangeText={setFatGoalG} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <Text style={styles.sectionTitle}>Daily reminder</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{ false: colors.border, true: colors.accentTint }}
              thumbColor={reminderEnabled ? colors.accent : undefined}
            />
          </View>
          {reminderEnabled ? (
            <View style={styles.reminderTimeRow}>
              {REMINDER_TIMES.map((option) => (
                <TouchableOpacity
                  key={option.hour}
                  onPress={() => changeReminderTime(option.hour)}
                  style={[
                    styles.directionChip,
                    reminderHour === option.hour && styles.directionChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.directionChipText,
                      reminderHour === option.hour &&
                        styles.directionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.reminderHint}>
              One reminder a day, nothing else — no streak-shaming, no social
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
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  directionRow: { flexDirection: "row", gap: 10 },
  directionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  directionChipActive: { backgroundColor: colors.accent },
  directionChipText: {
    color: colors.text,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  directionChipTextActive: { color: colors.onAccent },
  fieldLabel: { color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: colors.onAccent, fontWeight: "700" },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  accountEmail: { ...type.label, color: colors.textMuted },
  accountAction: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  accountActionText: { color: colors.text, fontWeight: "600" },
  signOutText: { color: colors.danger, fontWeight: "600" },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderTimeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  reminderHint: { ...type.label, color: colors.textMuted },
});
