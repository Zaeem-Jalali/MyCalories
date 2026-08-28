import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

import { motion } from "../../constants/theme";

// Every animation in the app asks this first. When the OS setting is on,
// entrances resolve instantly rather than being skipped, so nothing that
// depends on an animation is ever left hidden.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

// Staggered entrance for a list. One list per screen, at the structural
// timing: the delay steps between items, the duration stays constant.
export function FadeInUp({
  index = 0,
  children,
}: {
  index?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.structural,
      // Capped so a long list never turns into a slow reveal.
      delay: Math.min(index * 45, 270),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, progress, reduced]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// A single acknowledgement when a value the user earned goes up. Not a loop,
// not an always-on effect: it fires once, when the number actually changes.
export function useBumpOnChange(value: number | undefined): Animated.Value {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (reduced) return;
    if (before === undefined || value === undefined) return;
    if (value <= before) return;

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.18,
        duration: motion.press,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.structural,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [value, scale, reduced]);

  return scale;
}
