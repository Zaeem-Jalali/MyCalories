import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Logomark } from "../components/ui/Logomark";
import { colors, motion, spacing, type } from "../constants/theme";

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
          style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}
        >
          <Logomark size={76} variant="onWhite" />
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
        <Button
          label="Create an account"
          onPress={() => router.push("/signIn?mode=signUp")}
        />
        <Button
          label="I already have one"
          variant="secondary"
          onPress={() => router.push("/signIn?mode=signIn")}
        />
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
  title: { ...type.display, color: colors.text, textAlign: "center" },
  tagline: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  actions: { padding: spacing.lg, gap: spacing.sm },
});
