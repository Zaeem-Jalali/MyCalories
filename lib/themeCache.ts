import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { ThemeMode } from "../constants/theme";

// The theme lives on the Convex profile, but that is a network round trip on a
// cold start. This cache is written whenever the choice changes and read once
// on launch so a dark-mode user does not get a light frame before the profile
// arrives. SecureStore has no web implementation, so web falls back to
// localStorage, the same split as lib/secureStorage.ts.
const KEY = "calorieai.themeMode";

function isMode(v: string | null): v is ThemeMode {
  return v === "light" || v === "dark";
}

export async function readCachedThemeMode(): Promise<ThemeMode | null> {
  const v =
    Platform.OS === "web"
      ? localStorage.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
  return isMode(v) ? v : null;
}

export async function writeCachedThemeMode(mode: ThemeMode): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, mode);
  } else {
    await SecureStore.setItemAsync(KEY, mode);
  }
}

// Called on sign out so a shared device does not hand the next account the
// previous account's theme as its pre-network default.
export async function clearCachedThemeMode(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
