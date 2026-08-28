import { useAuthActions } from "@convex-dev/auth/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { PressableScale } from "../components/ui/PressableScale";
import { colors, radii, spacing, type } from "../constants/theme";

// Convex Auth throws plain Errors, and a deployed backend redacts those to a
// bare "Server Error" with a request id. So: map the messages that do come
// through, give a mode-appropriate line when the message was redacted, and
// show anything else verbatim rather than disguising a real backend failure
// as bad credentials.
function readableError(error: unknown, mode: "signIn" | "signUp"): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/already exists/i.test(message)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (/InvalidAccountId|InvalidSecret|no account|invalid credentials/i.test(message)) {
    return "That email and password don't match an account.";
  }
  if (/Invalid password|at least 8/i.test(message)) {
    return "Passwords need at least 8 characters.";
  }
  if (/Server Error/i.test(message)) {
    return mode === "signIn"
      ? "That email and password don't match an account."
      : "Couldn't create the account. That email may already be in use.";
  }
  return message;
}

export default function SignInScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const { signIn } = useAuthActions();

  const [mode, setMode] = useState<"signIn" | "signUp">(
    modeParam === "signUp" ? "signUp" : "signIn",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and a password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email: trimmedEmail, password, flow: mode });
      // The root layout's gate routes onward once the session lands, so there
      // is nothing to navigate to from here.
    } catch (caught) {
      setError(readableError(caught, mode));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <PressableScale
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/welcome")
            }
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back</Text>
          </PressableScale>

          <Text style={styles.title}>
            {mode === "signUp" ? "Create your account" : "Sign in"}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              textContentType={mode === "signUp" ? "newPassword" : "password"}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={mode === "signUp" ? "Create account" : "Sign in"}
            onPress={submit}
            busy={busy}
          />

          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              setError(null);
              setMode(mode === "signUp" ? "signIn" : "signUp");
            }}
            accessibilityRole="button"
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {mode === "signUp"
                ? "I already have an account"
                : "I need an account"}
            </Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  backButton: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  backText: { ...type.label, color: colors.textMuted, fontWeight: "600" },
  switchButton: { paddingVertical: spacing.sm, alignItems: "center" },
  title: { ...type.title, color: colors.text, marginTop: spacing.sm },
  field: { gap: spacing.xs },
  label: { ...type.label, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
  },
  error: { ...type.label, color: colors.danger },
  switchText: {
    ...type.label,
    color: colors.accent,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
