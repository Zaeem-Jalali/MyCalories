import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { UnitToggle } from "../components/UnitToggle";
import { todayKey } from "../lib/dateKey";
import { Authenticated } from "convex/react";
import {
  ActivityLevel,
  GoalDirection,
  Sex,
  computeGoals,
} from "../lib/goalCalculator";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little to no exercise" },
  { value: "light", label: "Lightly active", hint: "1-3 workouts a week" },
  { value: "moderate", label: "Moderately active", hint: "3-5 workouts a week" },
  { value: "active", label: "Active", hint: "6-7 workouts a week" },
  { value: "very_active", label: "Very active", hint: "Physical job or training twice a day" },
];

const RATE_OPTIONS = [0.5, 1, 1.5, 2];

const CM_PER_FOOT = 30.48;
const CM_PER_INCH = 2.54;
const LBS_PER_KG = 2.20462;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function OnboardingScreenContent() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEditing = edit === "1";
  const upsertProfile = useMutation(api.profile.upsert);
  const logWeight = useMutation(api.weightLogs.logWeight);
  const profile = useQuery(api.profile.get, {});
  // Only the edit flow needs the weight history, and a first-run user has no
  // session-scoped data to read yet.
  const weightLogs = useQuery(api.weightLogs.list, isEditing ? {} : "skip");

  // Starts on the first question when editing: the welcome step is for people
  // seeing the app for the first time, not for changing an answer.
  const [step, setStep] = useState(isEditing ? 1 : 0);

  const [firstName, setFirstName] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");

  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFeetInput, setHeightFeetInput] = useState("");
  const [heightInchesInput, setHeightInchesInput] = useState("");

  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [currentWeightInput, setCurrentWeightInput] = useState("");
  const [goalWeightInput, setGoalWeightInput] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    null,
  );
  const [goalDirection, setGoalDirection] = useState<GoalDirection | null>(
    null,
  );
  const [rateLbsPerWeek, setRateLbsPerWeek] = useState<number>(1);

  // Seeded once, the first time the saved answers arrive. Seeding on every
  // change would fight the user's typing.
  const seeded = useRef(false);
  const [seededWeightLbs, setSeededWeightLbs] = useState<number | null>(null);
  const [ready, setReady] = useState(!isEditing);
  useEffect(() => {
    if (!isEditing || seeded.current) return;
    if (!profile || weightLogs === undefined) return;
    seeded.current = true;

    if (profile.name) setFirstName(profile.name);
    if (profile.sex) setSex(profile.sex);
    if (profile.age) setAge(String(profile.age));
    if (profile.heightCm) {
      setHeightUnit("cm");
      setHeightCmInput(String(round1(profile.heightCm)));
    }
    if (profile.activityLevel) setActivityLevel(profile.activityLevel);
    setGoalDirection(profile.goalDirection);
    if (profile.rateLbsPerWeek) setRateLbsPerWeek(profile.rateLbsPerWeek);
    setWeightUnit("lbs");
    const latestWeight = weightLogs[weightLogs.length - 1]?.weightLbs;
    if (latestWeight) {
      setCurrentWeightInput(String(round1(latestWeight)));
      setSeededWeightLbs(round1(latestWeight));
    }
    if (profile.weightGoalLbs) {
      setGoalWeightInput(String(round1(profile.weightGoalLbs)));
    }
    setReady(true);
  }, [isEditing, profile, weightLogs]);

  const steps = [
    "welcome",
    "name",
    "sex",
    "age",
    "height",
    "weight",
    "activity",
    "direction",
    "rate",
    "review",
  ] as const;
  type StepKey = (typeof steps)[number];
  const currentStepKey = steps[step];
  const needsRateStep = goalDirection !== "maintain";
  const visibleSteps: StepKey[] = needsRateStep
    ? [...steps]
    : steps.filter((s) => s !== "rate");
  const visibleIndex = visibleSteps.indexOf(currentStepKey);
  const questionSteps = visibleSteps.filter((s) => s !== "welcome" && s !== "review");

  const goNext = () => {
    const nextIndex = steps.indexOf(currentStepKey) + 1;
    let next = steps[nextIndex];
    if (next === "rate" && !needsRateStep) {
      next = steps[nextIndex + 1];
    }
    setStep(steps.indexOf(next));
  };

  const goBack = () => {
    if (step === 0) return;
    const prevIndex = steps.indexOf(currentStepKey) - 1;
    let prev = steps[prevIndex];
    if (prev === "rate" && !needsRateStep) {
      prev = steps[prevIndex - 1];
    }
    setStep(steps.indexOf(prev));
  };

  // Canonical values (cm, lbs) derived from whichever unit the user picked —
  // storage and the goal formula stay in one unit regardless of input mode.
  const heightCm = round1(
    heightUnit === "cm"
      ? Number(heightCmInput)
      : Number(heightFeetInput || "0") * CM_PER_FOOT +
          Number(heightInchesInput || "0") * CM_PER_INCH,
  );

  const currentWeightLbs = round1(
    weightUnit === "lbs"
      ? Number(currentWeightInput)
      : Number(currentWeightInput) * LBS_PER_KG,
  );

  const goalWeightLbs = goalWeightInput
    ? round1(
        weightUnit === "lbs"
          ? Number(goalWeightInput)
          : Number(goalWeightInput) * LBS_PER_KG,
      )
    : undefined;

  const canProceed = (() => {
    switch (currentStepKey) {
      case "name":
        return firstName.trim().length > 0;
      case "sex":
        return sex !== null;
      case "age":
        return Number(age) > 0;
      case "height":
        return heightCm > 0;
      case "weight":
        return currentWeightLbs > 0;
      case "activity":
        return activityLevel !== null;
      case "direction":
        return goalDirection !== null;
      default:
        return true;
    }
  })();

  const goals =
    sex && activityLevel && goalDirection && Number(age) > 0
      ? computeGoals({
          sex,
          age: Number(age),
          heightCm,
          currentWeightLbs,
          activityLevel,
          goalDirection,
          rateLbsPerWeek: goalDirection === "maintain" ? 0 : rateLbsPerWeek,
        })
      : null;

  const finish = async () => {
    if (!goals || !sex || !activityLevel || !goalDirection) return;
    try {
      await upsertProfile({
        ...goals,
        goalDirection,
        weightGoalLbs: goalWeightLbs,
        rateLbsPerWeek: goalDirection === "maintain" ? 0 : rateLbsPerWeek,
        safetyFloorOverride: false,
        name: firstName.trim(),
        sex,
        age: Number(age),
        heightCm,
        activityLevel,
        onboardingCompleted: true,
      });

      // Editing an answer must not stamp an old measurement onto today. Only
      // a weight the user actually changed (or a first-run entry) is logged.
      const weightChanged =
        seededWeightLbs === null || currentWeightLbs !== seededWeightLbs;
      if (weightChanged) {
        await logWeight({ date: todayKey(), weightLbs: currentWeightLbs });
      }

      if (isEditing && router.canGoBack()) {
        router.back();
      } else {
        router.replace(isEditing ? "/(tabs)/settings" : "/");
      }
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // Nothing is editable until the saved answers have landed, otherwise the
  // seeding effect would overwrite whatever was typed in the meantime.
  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (currentStepKey === "welcome") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>CalorieAI</Text>
          <Text style={styles.welcomeSubtitle}>
            Snap a photo, log it in seconds, and see exactly where your day
            stands.
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Set up my goals</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.progressHeader}>
        <TouchableOpacity
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  currentStepKey === "review"
                    ? 100
                    : ((questionSteps.indexOf(currentStepKey) + 1) /
                        questionSteps.length) *
                      100
                }%`,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentStepKey === "name" && (
          <Step title="What should we call you?">
            <TextInput
              style={styles.bigInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              autoFocus
            />
          </Step>
        )}

        {currentStepKey === "sex" && (
          <Step
            title="What's your sex?"
            subtitle="This affects the calorie formula, so we need it to get your goal right."
          >
            <View style={styles.chipRow}>
              {(["female", "male"] as Sex[]).map((option) => (
                <Chip
                  key={option}
                  label={option === "female" ? "Female" : "Male"}
                  selected={sex === option}
                  onPress={() => setSex(option)}
                />
              ))}
            </View>
          </Step>
        )}

        {currentStepKey === "age" && (
          <Step title="How old are you?">
            <TextInput
              style={styles.bigInput}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Age"
              autoFocus
            />
          </Step>
        )}

        {currentStepKey === "height" && (
          <Step title="How tall are you?">
            <UnitToggle
              options={[
                { value: "cm", label: "cm" },
                { value: "ft", label: "ft/in" },
              ]}
              selected={heightUnit}
              onSelect={setHeightUnit}
            />
            {heightUnit === "cm" ? (
              <TextInput
                style={styles.bigInput}
                value={heightCmInput}
                onChangeText={setHeightCmInput}
                keyboardType="numeric"
                placeholder="Height (cm)"
                autoFocus
              />
            ) : (
              <View style={styles.row}>
                <TextInput
                  style={[styles.bigInput, { flex: 1 }]}
                  value={heightFeetInput}
                  onChangeText={setHeightFeetInput}
                  keyboardType="numeric"
                  placeholder="Feet"
                  autoFocus
                />
                <TextInput
                  style={[styles.bigInput, { flex: 1 }]}
                  value={heightInchesInput}
                  onChangeText={setHeightInchesInput}
                  keyboardType="numeric"
                  placeholder="Inches"
                />
              </View>
            )}
          </Step>
        )}

        {currentStepKey === "weight" && (
          <Step title="What's your current weight?">
            <UnitToggle
              options={[
                { value: "lbs", label: "lbs" },
                { value: "kg", label: "kg" },
              ]}
              selected={weightUnit}
              onSelect={setWeightUnit}
            />
            <TextInput
              style={styles.bigInput}
              value={currentWeightInput}
              onChangeText={setCurrentWeightInput}
              keyboardType="numeric"
              placeholder={`Weight (${weightUnit})`}
              autoFocus
            />
            <Text style={styles.fieldLabel}>Goal weight (optional)</Text>
            <TextInput
              style={styles.input}
              value={goalWeightInput}
              onChangeText={setGoalWeightInput}
              keyboardType="numeric"
              placeholder={`Goal weight (${weightUnit})`}
            />
          </Step>
        )}

        {currentStepKey === "activity" && (
          <Step title="How active are you day to day?">
            <View style={{ gap: spacing.sm }}>
              {ACTIVITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionRow,
                    activityLevel === option.value && styles.optionRowSelected,
                  ]}
                  onPress={() => setActivityLevel(option.value)}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Step>
        )}

        {currentStepKey === "direction" && (
          <Step title="What's your goal?">
            <View style={styles.chipRow}>
              {(["cut", "maintain", "bulk"] as GoalDirection[]).map(
                (option) => (
                  <Chip
                    key={option}
                    label={
                      option === "cut"
                        ? "Lose weight"
                        : option === "maintain"
                          ? "Maintain"
                          : "Gain weight"
                    }
                    selected={goalDirection === option}
                    onPress={() => setGoalDirection(option)}
                  />
                ),
              )}
            </View>
          </Step>
        )}

        {currentStepKey === "rate" && needsRateStep && (
          <Step
            title="How fast?"
            subtitle="Pounds per week. We won't let this push you below a safe calorie floor."
          >
            <View style={styles.chipRow}>
              {RATE_OPTIONS.map((rate) => (
                <Chip
                  key={rate}
                  label={`${rate} lb/wk`}
                  selected={rateLbsPerWeek === rate}
                  onPress={() => setRateLbsPerWeek(rate)}
                />
              ))}
            </View>
          </Step>
        )}

        {currentStepKey === "review" && goals && (
          <Step
            title={`You're all set, ${firstName.trim() || "there"}`}
            subtitle="These are your daily targets — fine-tune them anytime in Settings."
          >
            <View style={styles.reviewCard}>
              <Text style={styles.reviewValue}>{goals.calorieGoal}</Text>
              <Text style={styles.reviewUnit}>calories a day</Text>
              <View style={styles.reviewMacroRow}>
                <ReviewMacro label="Protein" value={goals.proteinGoalG} color={colors.protein} />
                <ReviewMacro label="Carbs" value={goals.carbsGoalG} color={colors.carbs} />
                <ReviewMacro label="Fat" value={goals.fatGoalG} color={colors.fat} />
              </View>
            </View>
          </Step>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, !canProceed && styles.buttonDisabled]}
          disabled={!canProceed}
          onPress={currentStepKey === "review" ? finish : goNext}
        >
          <Text style={styles.primaryButtonText}>
            {currentStepKey === "review" ? "Start tracking" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.stepTitle}>{title}</Text>
        {subtitle ? <Text style={styles.stepSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReviewMacro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.reviewMacro}>
      <View style={[styles.reviewMacroDot, { backgroundColor: color }]} />
      <Text style={styles.reviewMacroValue}>{value}g</Text>
      <Text style={styles.reviewMacroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", justifyContent: "center" },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  welcomeTitle: { ...type.display, fontSize: 40, color: colors.text },
  welcomeSubtitle: { ...type.body, color: colors.textMuted, maxWidth: 320 },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backArrow: { fontSize: 20, color: colors.text },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  content: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: "center",
  },
  stepTitle: { ...type.display, color: colors.text },
  stepSubtitle: { ...type.body, color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent,
  },
  chipText: { ...type.bodyStrong, color: colors.text },
  chipTextSelected: { color: colors.accent },
  row: { flexDirection: "row", gap: spacing.sm },
  bigInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    ...type.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionRowSelected: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent,
  },
  optionLabel: { ...type.bodyStrong, color: colors.text },
  optionHint: { ...type.label, color: colors.textMuted, marginTop: 2 },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  reviewValue: { fontSize: 52, fontWeight: "800", color: colors.text },
  reviewUnit: { ...type.body, color: colors.textMuted, marginTop: -8 },
  reviewMacroRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  reviewMacro: { alignItems: "center", gap: 4 },
  reviewMacroDot: { width: 8, height: 8, borderRadius: 4 },
  reviewMacroValue: { ...type.bodyStrong, color: colors.text },
  reviewMacroLabel: { ...type.label, color: colors.textMuted },
  footer: { padding: spacing.lg },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { ...type.bodyStrong, color: colors.onAccent },
});

// Reads account-scoped data when editing, so it never mounts without a session.
export default function OnboardingScreen() {
  return (
    <Authenticated>
      <OnboardingScreenContent />
    </Authenticated>
  );
}
