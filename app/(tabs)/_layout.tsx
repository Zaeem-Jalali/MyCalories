import { Ionicons } from "@expo/vector-icons";
import { Authenticated } from "convex/react";
import { Tabs } from "expo-router";

import { colors } from "../../constants/theme";

// Every screen under here reads account-scoped data, so none of them mount
// until there is a session. Without this the queries fire during sign-out and
// throw "Not signed in" before the gate has finished redirecting.
export default function TabsLayout() {
  return (
    <Authenticated>
      <TabsNavigator />
    </Authenticated>
  );
}

function TabsNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
