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
  // The unfilled part of a progress track. A hairline border is too faint to
  // read as a track once it sits on the raised surface, so this is a step
  // darker than `border` while staying quieter than any text.
  track: "#DBD2C2",

  accent: "#A15C00",
  accentTint: "#FBEEDC",
  onAccent: "#FFFFFF",
  // A lighter amber that holds up on the ink background. Used only where the
  // accent has to sit on dark: the reversed logo mark, and any future dark
  // surface. On light backgrounds always use `accent`.
  accentOnDark: "#F0B357",
  // Muted text that reads as the same family as the accent when it sits on the
  // amber tint (the launch screen). `textMuted` is cooler and goes grey there.
  accentTintText: "#8A6234",

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
  // Direction 3: confidence comes from size and tight tracking, not a heavy
  // weight. Headings sit at 600 with negative letter-spacing rather than 800.
  display: {
    fontSize: 32,
    fontWeight: "600" as const,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  // The one figure that carries a whole screen: eaten calories on home, the
  // computed goal on the onboarding review. Nothing else uses this size.
  hero: {
    fontSize: 60,
    fontWeight: "600" as const,
    lineHeight: 58,
    letterSpacing: -2,
  },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "500" as const, lineHeight: 17 },
};

// Every figure the user reads (calories, macros, weights, day counts) uses
// this, so digits keep a fixed width and columns of numbers line up instead
// of shifting as the values change.
export const tabular = { fontVariant: ["tabular-nums" as const] };

// Direction 3's primary separation mechanism: a hairline outline on the
// background, not a filled cream panel. `surface` stays for small inset fills
// (the exercise row, a segmented-control track) where an outline would be
// noise. Spread this into a StyleSheet entry and add padding per use.
export const card = {
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.lg,
} as const;

export const cardTight = { ...card, borderRadius: radii.md } as const;

// One elevation level, tinted with the text ink rather than black, so a
// raised surface reads warm against the cream palette. Surfaces are separated
// by background shifts; this is only for things that genuinely float.
export const elevation = {
  floating: {
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

// Opacity applied to a control that is present but not currently usable.
// A disabled control must look disabled, not merely refuse to respond.
export const disabledOpacity = 0.45;

// 150ms for press/selection feedback, 250ms for structural transitions
// (step changes, entrances) — matches the motion spec used across the app.
export const motion = {
  press: 150,
  structural: 250,
};
