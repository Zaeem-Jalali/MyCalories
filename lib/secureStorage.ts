import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenStorage } from "@convex-dev/auth/react";

// Convex Auth defaults to localStorage, which doesn't exist on native. Tokens
// go into the OS keystore instead. SecureStore has no web implementation, so
// the web preview falls back to localStorage, which is what the default would
// have been there anyway.
export const secureStorage: TokenStorage =
  Platform.OS === "web"
    ? {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
