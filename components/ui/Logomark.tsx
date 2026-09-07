import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { colors } from "../../constants/theme";

// The CalorieAI mark: one shape doing three jobs. A plate seen from above, a
// camera aperture, and a calorie ring that sits at ~60 percent fill, the same
// arc the home card shows mid day. The notch at the top is the gap in the ring
// and the shutter cut at once. Inside the ring sits produce rather than a lens:
// a leaf, an apple, a tomato, a berry and a carrot wedge, each cut apart by a
// hairline of the background so the cluster reads as separate pieces. Pure
// geometry on a 100 unit grid, no gradient, no illustration.
//
// The stroke thickens and the produce simplifies as the mark shrinks, so the
// gap and the shapes stay legible at icon sizes. `progress` is exposed for a
// future animated draw but defaults to the resting 60 percent.

type Variant = "primary" | "onWhite" | "reversed" | "mono";

const CIRCUMFERENCE = 2 * Math.PI * 38; // r = 38 on the 100 unit grid

// The arc starts a few degrees clockwise of top rather than exactly at 12
// o'clock, so its rounded start cap tucks behind the notch instead of bulging
// out onto the faint track side.
const ARC_START_DEG = -83;

const VARIANTS: Record<
  Variant,
  { surface: string; arc: string; track: string }
> = {
  // On the amber tint surface (the launch screen).
  primary: {
    surface: colors.accentTint,
    arc: colors.accent,
    track: "rgba(161, 92, 0, 0.18)",
  },
  // On the app background.
  onWhite: {
    surface: colors.background,
    arc: colors.accent,
    track: "rgba(161, 92, 0, 0.16)",
  },
  // On the ink background.
  reversed: {
    surface: colors.text,
    arc: colors.accentOnDark,
    track: "rgba(240, 179, 87, 0.22)",
  },
  // Single colour, for stamps and monochrome contexts.
  mono: {
    surface: colors.background,
    arc: colors.text,
    track: "rgba(28, 27, 26, 0.14)",
  },
};

// Ring stroke in grid units, thicker as the mark shrinks. 9 at 72px, 13 at 18px.
function strokeFor(size: number) {
  const t = Math.min(1, Math.max(0, (72 - size) / (72 - 18)));
  return 9 + t * 4;
}

// Which produce pieces survive at this rendered size. Full cluster on anything
// icon sized, apple plus tomato plus leaf around 30px, a single apple and leaf
// below that. The apple grows and centres as the others drop so the middle
// never looks empty.
function produceFor(size: number) {
  if (size >= 44) {
    return { apple: { cx: 41, cy: 51, r: 12 }, tomatoR: 8.5, berryR: 6.5, carrot: true };
  }
  if (size >= 22) {
    return { apple: { cx: 43, cy: 53, r: 13 }, tomatoR: 8.5, berryR: 0, carrot: false };
  }
  return { apple: { cx: 47, cy: 54, r: 15 }, tomatoR: 0, berryR: 0, carrot: false };
}

export function Logomark({
  size = 76,
  variant = "onWhite",
  progress = 0.6,
  // The notch and the hairline cuts between the produce show whatever sits
  // directly behind the mark. Defaults to the variant's own surface; pass the
  // real background when it differs.
  notchColor,
}: {
  size?: number;
  variant?: Variant;
  progress?: number;
  notchColor?: string;
}) {
  const { surface, arc, track } = VARIANTS[variant];
  const stroke = strokeFor(size);
  const cut = notchColor ?? surface;
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const p = produceFor(size);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx={50}
        cy={50}
        r={38}
        fill="none"
        stroke={track}
        strokeWidth={stroke}
      />
      <Circle
        cx={50}
        cy={50}
        r={38}
        fill="none"
        stroke={arc}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashoffset}
        transform={`rotate(${ARC_START_DEG} 50 50)`}
      />
      <G fill={arc}>
        <Path d="M50 37 C52 30 59 26 65 27 C64 34 58 39 51 39 Z" />
        <Circle cx={p.apple.cx} cy={p.apple.cy} r={p.apple.r} />
        {p.tomatoR > 0 ? (
          <Circle cx={60} cy={55} r={p.tomatoR} stroke={cut} strokeWidth={2.6} />
        ) : null}
        {p.berryR > 0 ? (
          <Circle cx={52} cy={67} r={p.berryR} stroke={cut} strokeWidth={2.6} />
        ) : null}
        {p.carrot ? (
          <Path
            d="M31 60 L41 62 L34 71 Z"
            stroke={cut}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
        ) : null}
      </G>
      <Rect x={47} y={4} width={6} height={13} rx={3} fill={cut} />
    </Svg>
  );
}
