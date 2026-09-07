import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";

import { api } from "../convex/_generated/api";
import { palettes, type ThemeColors, type ThemeMode } from "../constants/theme";
import { readCachedThemeMode, writeCachedThemeMode } from "../lib/themeCache";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark";
}

// Resolution order for the active mode:
// 1. a choice made this session, before the mutation has round tripped
// 2. the value on the Convex profile
// 3. the value cached on the device from a previous session
// 4. light
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.profile.get, {});
  const setThemeMutation = useMutation(api.profile.setTheme);

  const [pending, setPending] = useState<ThemeMode | null>(null);
  const [cached, setCached] = useState<ThemeMode | null>(null);

  useEffect(() => {
    let active = true;
    readCachedThemeMode()
      .then((m) => {
        if (active && m) setCached(m);
      })
      .catch(() => {
        // A missing or unreadable cache just means no pre-network hint.
      });
    return () => {
      active = false;
    };
  }, []);

  // Once the profile answers, its value is authoritative and any local pending
  // choice can be dropped.
  useEffect(() => {
    if (isMode(profile?.theme)) setPending(null);
  }, [profile?.theme]);

  const fromProfile = isMode(profile?.theme) ? profile.theme : null;
  const mode: ThemeMode = pending ?? fromProfile ?? cached ?? "light";

  const setMode = useCallback(
    (next: ThemeMode) => {
      setPending(next);
      setThemeMutation({ theme: next })
        .then(() => {
          // Cache only once the server has accepted it, so a rejected write
          // never persists across cold starts.
          void writeCachedThemeMode(next);
        })
        .catch((error) => {
          setPending(null);
          Alert.alert(
            "Couldn't switch theme",
            error instanceof Error ? error.message : "Please try again.",
          );
        });
    },
    [setThemeMutation],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: palettes[mode], setMode }),
    [mode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return ctx;
}

// Build a themed stylesheet from a factory. Define the factory at module level
// (wrapping StyleSheet.create so it stays type checked) so its identity is
// stable and the result only rebuilds when the theme changes.
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
