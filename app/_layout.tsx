import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { convex } from "../lib/convexClient";

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ConvexProvider>
  );
}
