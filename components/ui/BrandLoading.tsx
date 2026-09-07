import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { tabular, type ThemeMode } from "../../constants/theme";
import { useReducedMotion } from "./motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CIRCUMFERENCE = 2 * Math.PI * 38;
const REST_PROGRESS = 0.6;

// The launch screen has its own warm palette, a shade deeper than the app
// background, matching the native splash it hands off from.
const SPLASH = {
  light: {
    bg: "#FBEEDC",
    accent: "#A15C00",
    cut: "#FBEEDC",
    tintInk: "#8A6234",
    ink: "#1C1B1A",
    ringTrack: "rgba(161, 92, 0, 0.16)",
    barTrack: "rgba(161, 92, 0, 0.18)",
  },
  dark: {
    bg: "#1B150C",
    accent: "#E9A94E",
    cut: "#1B150C",
    tintInk: "#E9A94E",
    ink: "#F4F0EA",
    ringTrack: "rgba(233, 169, 78, 0.18)",
    barTrack: "rgba(233, 169, 78, 0.22)",
  },
} as const;

// The launch sequence. The tint fills the screen, the mark settles, the ring
// draws to its resting fill, the produce pops, the wordmark and tagline rise,
// and a determinate rule runs along the bottom. No spinner anywhere. Home
// renders underneath from the first frame, so this hands off to real content
// rather than blocking on it: once `done` is true and a minimum beat has
// passed, the whole layer cross-fades out and calls `onHidden`.

const INTRO_MS = 1300;
const MIN_VISIBLE_MS = 1200;
const FADE_MS = 320;

export function BrandLoading({
  done,
  onHidden,
  mode = "light",
  statusLine = "Syncing today",
}: {
  done: boolean;
  onHidden: () => void;
  mode?: ThemeMode;
  statusLine?: string;
}) {
  const reduceMotion = useReducedMotion();
  const mountedAt = useRef(Date.now()).current;
  const c = SPLASH[mode];

  // This layer looks like the native splash it replaces, so hand off the
  // moment it is on screen. `catch` because a double call (fast refresh) is
  // harmless and must not surface.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Two timelines running the same curve: one on the native thread for opacity
  // and transforms, one on JS for the SVG stroke, which the native driver
  // cannot touch.
  const tNative = useRef(new Animated.Value(0)).current;
  const tSvg = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      tNative.setValue(1);
      tSvg.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(tNative, {
        toValue: 1,
        duration: INTRO_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(tSvg, {
        toValue: 1,
        duration: INTRO_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();
  }, [reduceMotion, tNative, tSvg]);

  useEffect(() => {
    if (!done) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt));
    const id = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHidden();
      });
    }, wait);
    return () => clearTimeout(id);
  }, [done, fade, mountedAt, onHidden]);

  // Keyframe windows as fractions of INTRO_MS, matching the canvas timing:
  // mark 0-320, arc 220-1120, produce 620-880, notch 900-1100, wordmark
  // 820-1070, tagline 940-1190, bar 600-1300, status 1000-1200.
  const markOpacity = tNative.interpolate({
    inputRange: [0, 0.25],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const markScale = tNative.interpolate({
    inputRange: [0, 0.25],
    outputRange: [0.86, 1],
    extrapolate: "clamp",
  });
  const markRotate = tNative.interpolate({
    inputRange: [0, 0.25],
    outputRange: ["-8deg", "0deg"],
    extrapolate: "clamp",
  });
  const lensScale = tNative.interpolate({
    inputRange: [0.48, 0.6, 0.68],
    outputRange: [0, 1.12, 1],
    extrapolate: "clamp",
  });
  const lensOpacity = tNative.interpolate({
    inputRange: [0.48, 0.56],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const notchOpacity = tNative.interpolate({
    inputRange: [0.69, 0.85],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const wordShift = tNative.interpolate({
    inputRange: [0.63, 0.82],
    outputRange: [10, 0],
    extrapolate: "clamp",
  });
  const wordOpacity = tNative.interpolate({
    inputRange: [0.63, 0.82],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const taglineShift = tNative.interpolate({
    inputRange: [0.72, 0.91],
    outputRange: [10, 0],
    extrapolate: "clamp",
  });
  const taglineOpacity = tNative.interpolate({
    inputRange: [0.72, 0.91],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const barScale = tNative.interpolate({
    inputRange: [0.46, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const statusOpacity = tNative.interpolate({
    inputRange: [0.77, 0.92],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const dashoffset = tSvg.interpolate({
    inputRange: [0.17, 0.86],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - REST_PROGRESS)],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: c.bg, opacity: fade }]}
    >
      <Animated.View
        style={{
          opacity: markOpacity,
          transform: [{ scale: markScale }, { rotate: markRotate }],
        }}
      >
        <Svg width={132} height={132} viewBox="0 0 100 100">
          <Circle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke={c.ringTrack}
            strokeWidth={9}
          />
          <AnimatedCircle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke={c.accent}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            // Start a few degrees past top so the round start cap tucks behind
            // the notch, matching Logomark.
            transform="rotate(-83 50 50)"
          />
        </Svg>
        <Animated.View
          style={[styles.lensWrap, { opacity: lensOpacity }]}
          pointerEvents="none"
        >
          <Animated.View style={{ transform: [{ scale: lensScale }] }}>
            <Svg width={132} height={132} viewBox="0 0 100 100">
              <G fill={c.accent}>
                <Path d="M50 37 C52 30 59 26 65 27 C64 34 58 39 51 39 Z" />
                <Circle cx={41} cy={51} r={12} />
                <Circle
                  cx={60}
                  cy={55}
                  r={8.5}
                  stroke={c.cut}
                  strokeWidth={2.6}
                />
                <Circle
                  cx={52}
                  cy={67}
                  r={6.5}
                  stroke={c.cut}
                  strokeWidth={2.6}
                />
                <Path
                  d="M31 60 L41 62 L34 71 Z"
                  stroke={c.cut}
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                />
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>
        <Animated.View
          style={[styles.lensWrap, { opacity: notchOpacity }]}
          pointerEvents="none"
        >
          <Svg width={132} height={132} viewBox="0 0 100 100">
            <Rect x={47} y={4} width={6} height={13} rx={3} fill={c.cut} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.word,
          {
            color: c.ink,
            opacity: wordOpacity,
            transform: [{ translateY: wordShift }],
          },
        ]}
      >
        CalorieAI
      </Animated.Text>
      <Animated.Text
        style={[
          styles.tagline,
          {
            color: c.tintInk,
            opacity: taglineOpacity,
            transform: [{ translateY: taglineShift }],
          },
        ]}
      >
        Photograph the plate
      </Animated.Text>

      <View style={styles.footer}>
        <View style={[styles.track, { backgroundColor: c.barTrack }]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: c.accent, transform: [{ scaleX: barScale }] },
            ]}
          />
        </View>
        <Animated.Text
          style={[styles.status, { color: c.tintInk, opacity: statusOpacity }]}
        >
          {statusLine}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  lensWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  word: {
    marginTop: 26,
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 78,
    alignItems: "center",
    gap: 14,
  },
  track: {
    width: 120,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    // Grow from the left edge, not the center.
    transformOrigin: "left",
  },
  status: {
    fontSize: 12.5,
    ...tabular,
  },
});
