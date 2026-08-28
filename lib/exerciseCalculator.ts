export type WalkPace = "slow" | "normal" | "brisk";

// Standard MET (metabolic equivalent) values for walking, per the Compendium
// of Physical Activities — the same reference tables clinical calculators use.
const MET_BY_PACE: Record<WalkPace, number> = {
  slow: 2.8, // ~2 mph
  normal: 3.5, // ~3 mph
  brisk: 5.0, // ~4 mph
};

export const PACE_LABELS: Record<WalkPace, string> = {
  slow: "Slow (~2 mph)",
  normal: "Normal (~3 mph)",
  brisk: "Brisk (~4 mph)",
};

const LBS_PER_KG = 2.20462;

export function caloriesBurnedWalking(
  pace: WalkPace,
  durationMinutes: number,
  weightLbs: number,
): number {
  const weightKg = weightLbs / LBS_PER_KG;
  const met = MET_BY_PACE[pace];
  // kcal = MET * 3.5 * weightKg / 200 * minutes — standard MET formula.
  const kcal = (met * 3.5 * weightKg * durationMinutes) / 200;
  return Math.round(kcal);
}
