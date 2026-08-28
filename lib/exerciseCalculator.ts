export type Activity = "walk" | "run" | "cycle" | "weights";

// The three intensity steps are shared across activities and keep the original
// walking values, so exercise rows logged before the other activities existed
// still read and calculate correctly.
export type Intensity = "slow" | "normal" | "brisk";

export const ACTIVITIES: Activity[] = ["walk", "run", "cycle", "weights"];
export const INTENSITIES: Intensity[] = ["slow", "normal", "brisk"];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  walk: "Walk",
  run: "Run",
  cycle: "Cycle",
  weights: "Weights",
};

// Standard MET (metabolic equivalent) values per the Compendium of Physical
// Activities — the same reference tables clinical calculators use.
const MET: Record<Activity, Record<Intensity, number>> = {
  walk: { slow: 2.8, normal: 3.5, brisk: 5.0 },
  run: { slow: 8.3, normal: 9.8, brisk: 11.8 },
  cycle: { slow: 4.0, normal: 8.0, brisk: 10.0 },
  weights: { slow: 3.5, normal: 5.0, brisk: 6.0 },
};

const INTENSITY_LABELS: Record<Activity, Record<Intensity, string>> = {
  walk: {
    slow: "Slow (~2 mph)",
    normal: "Normal (~3 mph)",
    brisk: "Brisk (~4 mph)",
  },
  run: {
    slow: "Easy (~5 mph)",
    normal: "Steady (~6 mph)",
    brisk: "Fast (~7.5 mph)",
  },
  cycle: {
    slow: "Easy (<10 mph)",
    normal: "Steady (~13 mph)",
    brisk: "Fast (~15 mph)",
  },
  weights: {
    slow: "Light",
    normal: "Moderate",
    brisk: "Vigorous",
  },
};

export function intensityLabel(
  activity: Activity,
  intensity: Intensity,
): string {
  return INTENSITY_LABELS[activity][intensity];
}

const LBS_PER_KG = 2.20462;

export function caloriesBurned(
  activity: Activity,
  intensity: Intensity,
  durationMinutes: number,
  weightLbs: number,
): number {
  const weightKg = weightLbs / LBS_PER_KG;
  const met = MET[activity][intensity];
  // kcal = MET * 3.5 * weightKg / 200 * minutes — standard MET formula.
  const kcal = (met * 3.5 * weightKg * durationMinutes) / 200;
  return Math.round(kcal);
}
