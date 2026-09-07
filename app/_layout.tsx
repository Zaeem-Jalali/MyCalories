import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import { BrandLoading } from "../components/ui/BrandLoading";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import { convex } from "../lib/convexClient";
import { secureStorage } from "../lib/secureStorage";

// Hold the native splash (the static amber frame) until the JS launch sequence
// has mounted, so the two never show a white frame between them.
SplashScreen.preventAutoHideAsync();

// The three states the app can be in, and where each one belongs:
// not signed in goes to the welcome screen, signed in without a finished
// profile goes to onboarding, and signed in with one goes to the tabs.
const PUBLIC_ROUTES = ["welcome", "signIn"];

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { mode, colors } = useTheme();
  // Deliberately convex/react's hook, not the one from @convex-dev/auth:
  // this one only flips once the websocket has confirmed the identity, which
  // is when account-scoped queries start answering as that account. The auth
  // package's version flips as soon as the token is in memory, which would
  // pair a signed-in flag with a profile still fetched as signed-out and send
  // returning users back through onboarding.
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Returns null when signed out, so it never blocks the public routes.
  const profile = useQuery(api.profile.get, {});

  const route = segments[0] ?? "";
  const onPublicRoute = PUBLIC_ROUTES.includes(route);
  const onOnboarding = route === "onboarding";
  const profileLoading = isAuthenticated && profile === undefined;

  // The launch sequence stays mounted through its own cross-fade, past the
  // point where auth has settled, so it is torn down by `onHidden` rather than
  // by this flag flipping.
  const [launchDone, setLaunchDone] = useState(false);
  const settling = isLoading || profileLoading;

  useEffect(() => {
    if (isLoading || profileLoading) return;

    if (!isAuthenticated) {
      if (!onPublicRoute) router.replace("/welcome");
      return;
    }

    if (!profile?.onboardingCompleted) {
      if (!onOnboarding) router.replace("/onboarding");
      return;
    }

    // Onboarding is deliberately not redirected away from here: a signed-in
    // user reaches it again to edit their answers.
    if (onPublicRoute) router.replace("/");
  }, [
    isLoading,
    profileLoading,
    isAuthenticated,
    profile?.onboardingCompleted,
    onPublicRoute,
    onOnboarding,
    router,
  ]);

  // The navigator stays mounted while auth settles and the launch layer sits
  // over it. Swapping it out would unmount the whole stack and throw away
  // navigation state every time the auth state changes.
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 200,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="signIn" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="log"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="exercise"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="mealDetail" />
        <Stack.Screen name="monthlyReport" />
      </Stack>
      {!launchDone ? (
        <BrandLoading
          mode={mode}
          done={!settling}
          onHidden={() => setLaunchDone(true)}
        />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthGate />
        </ThemeProvider>
      </SafeAreaProvider>
    </ConvexAuthProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
