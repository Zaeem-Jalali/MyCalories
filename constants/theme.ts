// Design tokens, named by role (not by hue) so a dark theme can be derived
// later without renaming. Accent is a deep amber/gold: distinct from the
// teal/mint and orange/flame already common in this app category, warm and
// food-appropriate without reaching for the generic "healthy green."
export const colors = {
  background: "#FFFFFF",
  surface: "#F6F2EC",
  surfaceRaised: "#FBF8F3",
  text: "#1C1B1A",
  textMuted: "#736C62",
  border: "#E8E2D8",

  accent: "#A15C00",
  accentTint: "#FBEEDC",
  onAccent: "#FFFFFF",

  danger: "#C0392B",

  // Macro data colors — a small three-value semantic palette for the rings,
  // deliberately kept out of the accent's amber family so they never read
  // as competing brand colors.
  protein: "#C1495A",
  carbs: "#4F8F6B",
  fat: "#4472A8",
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// System font, deliberately: zero-config, renders natively crisp per OS,
// and this app doesn't yet warrant custom font-loading infrastructure.
// Confidence comes from size/weight/line-height, not a display typeface.
export const type = {
  display: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "500" as const, lineHeight: 17 },
};

// 150ms for press/selection feedback, 250ms for structural transitions
// (step changes, entrances) — matches the motion spec used across the app.
export const motion = {
  press: 150,
  structural: 250,
};
