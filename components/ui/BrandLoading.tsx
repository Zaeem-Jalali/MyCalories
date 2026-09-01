import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { colors, motion, radii } from "../../constants/theme";
import { useReducedMotion } from "./motion";

// The screen shown while auth settles and the first queries load. It carries
// the same "CA" mark as the welcome screen so a cold start reads as the app
// opening, not a blank white gap with a spinner. The mark breathes slowly
// rather than spinning, which keeps the wait calm.
export function BrandLoading() {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.structural,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, pulse, reduceMotion]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mark, { opacity: Animated.multiply(opacity, pulse) }]}>
        <Text style={styles.markText}>CA</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  mark: {
    width: 76,
    height: 76,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.onAccent,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
