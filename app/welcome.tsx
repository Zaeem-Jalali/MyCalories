import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, motion, radii, spacing, type } from "../constants/theme";

// One entrance, choreographed: the mark settles first, the words follow it.
// Everything is timed against the structural token so this reads as the same
// system as the rest of the app rather than a one-off intro animation.
export default function WelcomeScreen() {
  const router = useRouter();

  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.92)).current;
  const wordsOpacity = useRef(new Animated.Value(0)).current;
  const wordsShift = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: motion.structural,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 1,
          duration: motion.structural,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordsOpacity, {
          toValue: 1,
          duration: motion.structural,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wordsShift, {
          toValue: 0,
          duration: motion.structural,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [markOpacity, markScale, wordsOpacity, wordsShift]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.mark,
            { opacity: markOpacity, transform: [{ scale: markScale }] },
          ]}
        >
          <Text style={styles.markText}>CA</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: wordsOpacity,
            transform: [{ translateY: wordsShift }],
          }}
        >
          <Text style={styles.title}>CalorieAI</Text>
          <Text style={styles.tagline}>
            Photograph the plate. Keep the numbers honest.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, { opacity: wordsOpacity }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/signIn?mode=signUp")}
        >
          <Text style={styles.primaryButtonText}>Create an account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/signIn?mode=signIn")}
        >
          <Text style={styles.secondaryButtonText}>I already have one</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.onAccent,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { ...type.display, color: colors.text, textAlign: "center" },
  tagline: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  actions: { padding: spacing.lg, gap: spacing.sm },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: { ...type.bodyStrong, color: colors.onAccent },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: { ...type.bodyStrong, color: colors.text },
});
