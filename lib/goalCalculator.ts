export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalDirection = "cut" | "maintain" | "bulk";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const LBS_PER_KG = 2.20462;
const KCAL_PER_LB_OF_BODY_FAT = 3500;

export type GoalInputs = {
  sex: Sex;
  age: number;
  heightCm: number;
  currentWeightLbs: number;
  activityLevel: ActivityLevel;
  goalDirection: GoalDirection;
  rateLbsPerWeek: number; // 0 for maintain, otherwise a positive pace
};

export type ComputedGoals = {
  calorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export function computeGoals(inputs: GoalInputs): ComputedGoals {
  const weightKg = inputs.currentWeightLbs / LBS_PER_KG;

  // Mifflin-St Jeor
  const bmr =
    10 * weightKg +
    6.25 * inputs.heightCm -
    5 * inputs.age +
    (inputs.sex === "male" ? 5 : -161);

  const tdee = bmr * ACTIVITY_MULTIPLIERS[inputs.activityLevel];

  const dailyAdjustment =
    (inputs.rateLbsPerWeek * KCAL_PER_LB_OF_BODY_FAT) / 7;

  const calorieGoal =
    inputs.goalDirection === "cut"
      ? tdee - dailyAdjustment
      : inputs.goalDirection === "bulk"
        ? tdee + dailyAdjustment
        : tdee;

  // Protein: ~1g per lb of current bodyweight (supports both cutting and
  // bulking goals). Fat: 25% of calories. Carbs: whatever's left.
  const proteinGoalG = Math.round(inputs.currentWeightLbs);
  const fatGoalG = Math.round((calorieGoal * 0.25) / 9);
  const carbsGoalG = Math.round(
    (calorieGoal - proteinGoalG * 4 - fatGoalG * 9) / 4,
  );

  return {
    calorieGoal: Math.round(calorieGoal),
    proteinGoalG,
    carbsGoalG: Math.max(carbsGoalG, 0),
    fatGoalG,
  };
}
