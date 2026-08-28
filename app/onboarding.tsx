import { useMutation } from "convex/react";
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

import { api } from "../convex/_generated/api";
import { colors } from "../constants/theme";
import {
  ActivityLevel,
  GoalDirection,
  Sex,
  computeGoals,
} from "../lib/goalCalculator";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little to no exercise" },
  { value: "light", label: "Lightly active", hint: "1-3 workouts/week" },
  { value: "moderate", label: "Moderately active", hint: "3-5 workouts/week" },
  { value: "active", label: "Active", hint: "6-7 workouts/week" },
  { value: "very_active", label: "Very active", hint: "Physical job or 2x/day training" },
];

const RATE_OPTIONS = [0.5, 1, 1.5, 2];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const upsertProfile = useMutation(api.profile.upsert);
  const logWeight = useMutation(api.weightLogs.logWeight);

  const [step, setStep] = useState(0);

  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeightLbs, setCurrentWeightLbs] = useState("");
  const [goalWeightLbs, setGoalWeightLbs] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    null,
  );
  const [goalDirection, setGoalDirection] = useState<GoalDirection | null>(
    null,
  );
  const [rateLbsPerWeek, setRateLbsPerWeek] = useState<number>(1);

  const steps = [
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

  const canProceed = (() => {
    switch (currentStepKey) {
      case "sex":
        return sex !== null;
      case "age":
        return Number(age) > 0;
      case "height":
        return Number(heightCm) > 0;
      case "weight":
        return Number(currentWeightLbs) > 0;
      case "activity":
        return activityLevel !== null;
      case "direction":
        return goalDirection !== null;
      case "rate":
        return true;
      default:
        return true;
    }
  })();

  const goals =
    sex && activityLevel && goalDirection && Number(age) > 0
      ? computeGoals({
          sex,
          age: Number(age),
          heightCm: Number(heightCm),
          currentWeightLbs: Number(currentWeightLbs),
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
        weightGoalLbs: goalWeightLbs ? Number(goalWeightLbs) : undefined,
        safetyFloorOverride: false,
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        activityLevel,
        onboardingCompleted: true,
      });
      await logWeight({
        date: todayKey(),
        weightLbs: Number(currentWeightLbs),
      });
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.progressRow}>
        {visibleSteps.map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              i <= visibleIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentStepKey === "sex" && (
          <Step title="What's your sex?" subtitle="Used to estimate your calorie needs.">
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
          <Step title="How tall are you?" subtitle="In centimeters.">
            <TextInput
              style={styles.bigInput}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
              placeholder="Height (cm)"
              autoFocus
            />
          </Step>
        )}

        {currentStepKey === "weight" && (
          <Step title="What's your current weight?" subtitle="In pounds.">
            <TextInput
              style={styles.bigInput}
              value={currentWeightLbs}
              onChangeText={setCurrentWeightLbs}
              keyboardType="numeric"
              placeholder="Weight (lbs)"
              autoFocus
            />
            <Text style={styles.fieldLabel}>Goal weight (optional)</Text>
            <TextInput
              style={styles.input}
              value={goalWeightLbs}
              onChangeText={setGoalWeightLbs}
              keyboardType="numeric"
              placeholder="Goal weight (lbs)"
            />
          </Step>
        )}

        {currentStepKey === "activity" && (
          <Step title="How active are you day to day?">
            <View style={{ gap: 10 }}>
              {ACTIVITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionRow,
                    activityLevel === option.value && styles.optionRowSelected,
                  ]}
                  onPress={() => setActivityLevel(option.value)}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      activityLevel === option.value &&
                        styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionHint,
                      activityLevel === option.value &&
                        styles.optionLabelSelected,
                    ]}
                  >
                    {option.hint}
                  </Text>
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
          <Step title="Your daily goals" subtitle="You can fine-tune these anytime in Settings.">
            <View style={styles.reviewCard}>
              <Text style={styles.reviewValue}>{goals.calorieGoal} cal</Text>
              <View style={styles.reviewMacroRow}>
                <Text style={styles.reviewMacro}>
                  {goals.proteinGoalG}g protein
                </Text>
                <Text style={styles.reviewMacro}>
                  {goals.carbsGoalG}g carbs
                </Text>
                <Text style={styles.reviewMacro}>{goals.fatGoalG}g fat</Text>
              </View>
            </View>
          </Step>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={goBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity
          style={[styles.primaryButton, !canProceed && styles.buttonDisabled]}
          disabled={!canProceed}
          onPress={currentStepKey === "review" ? finish : goNext}
        >
          <Text style={styles.primaryButtonText}>
            {currentStepKey === "review" ? "Get started" : "Next"}
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
    <View style={{ gap: 16 }}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.text },
  content: { padding: 24, flexGrow: 1, justifyContent: "center" },
  stepTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  stepSubtitle: { color: colors.textMuted, marginTop: 6 },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.text },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextSelected: { color: colors.background },
  bigInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    color: colors.text,
  },
  fieldLabel: { color: colors.textMuted, marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  optionRowSelected: { backgroundColor: colors.text, borderColor: colors.text },
  optionLabel: { fontWeight: "600", color: colors.text },
  optionLabelSelected: { color: colors.background },
  optionHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  reviewValue: { fontSize: 32, fontWeight: "800", color: colors.text },
  reviewMacroRow: { flexDirection: "row", gap: 16 },
  reviewMacro: { color: colors.textMuted, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.background, fontWeight: "700" },
});
