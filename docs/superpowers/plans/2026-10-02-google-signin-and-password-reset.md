# Google sign-in and password reset Implementation Plan

> **Status (2026-10-06):** Only the Google sign-in parts shipped (PR #8). The password reset tasks (Resend, forgot password screen) were built, then removed because the project has no email service. Treat those tasks as historical.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" and an emailed-code password reset to the CalorieAI sign-in flow.

**Architecture:** Both features extend the existing Convex Auth setup in `convex/auth.ts`. Reset is the Password provider's built-in `reset` option backed by a small Resend email provider. Google is an Auth.js OAuth provider reached through a browser redirect on the Convex HTTP site, returning to the app through the `calorieai://` scheme. Account linking uses Convex Auth's default (verified email only), no custom hook.

**Tech Stack:** Expo 54, expo-router, `@convex-dev/auth` 0.0.95, `@auth/core` 0.41, Convex, Resend (HTTP), `expo-web-browser` (new, native).

**Spec:** `docs/superpowers/specs/2026-10-02-google-signin-and-password-reset-design.md`

## Global Constraints

- Branch off `docs/readme-and-plan-cleanup` into `feat/google-signin-password-reset`. Never commit to `setup/init` or `main`. **Do not commit, push or open a PR unless the user asks.** Tasks end with a verification checkpoint, not a commit.
- Read `convex/_generated/ai/guidelines.md` before editing Convex code, if the file exists (it was absent when this plan was written; skip if still absent).
- UI: colours, radii, spacing and type only from `constants/theme.ts` via `useThemedStyles(makeStyles)`. Reuse `Button`, `PressableScale`. No raw pixel values in stylesheets beyond what `signIn.tsx` already uses.
- Voice: sentence case, buttons name the action, no em dashes anywhere (code, comments, copy), no helper text under headings or labels.
- Secrets: `AUTH_RESEND_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL` live only on the Convex deployment. Never read `.env*`, never print values, never write them into repo files. The user sets them (Task 1 step 5 and Task 3 step 4 give exact commands with placeholders).
- Done means `npx tsc --noEmit` has zero errors.
- Installing packages needs the user's yes. Task 4 installs one (`expo-web-browser`), and the user has approved the plan that names it.
- The Convex dev deployment is shared with the installed app. All backend changes here are additive (new provider, new flow), so installed builds keep working.
- Native change: `expo-web-browser` changes the fingerprint, so Google needs a new `eas build`. Reset is JS-only on the app side. See AGENTS.md "Shipping to the phone".
- The repo has no automated test runner. Verification is `tsc` plus the manual round trips listed per task. Do not add a test framework as part of this work.

## Review Focus

1. Unknown email on reset: the request step throws for an email with no account. The screen must show a plain error and not crash, and must not reveal anything beyond what sign-up already reveals ("already exists").
2. Wrong code: stays on the code step, shows a clear message, keeps the typed email.
3. Expired code (15 min): the server cannot tell it from a wrong code, so both get one message that suggests checking the code or asking for a new one. Requesting a new code must work.
4. New password that breaks `PASSWORD_RULES` on reset: blocked client-side and, if bypassed, rejected server-side by the existing `validatePasswordRequirements`.
5. User cancels the Google browser sheet: no error banner, button usable again.
6. Google redirect returns without a `code` (denied consent): shows a short error, not a crash.

---

### Task 1: Backend password reset

**Files:**
- Create: `convex/ResendOTP.ts`
- Modify: `convex/auth.ts` (provider config, comment block at the top)

**Interfaces:**
- Produces: Password provider id `"password"` now accepts `flow: "reset"` (params `{ email }`) and `flow: "reset-verification"` (params `{ email, code, newPassword }`). Used by Task 2.

- [ ] **Step 1: Create the branch**

```bash
cd /d/calorie-ai && git checkout -b feat/google-signin-password-reset
```

- [ ] **Step 2: Create `convex/ResendOTP.ts`**

```ts
import Resend from "@auth/core/providers/resend";

// Sends the 6-digit reset code through Resend's HTTP API. Failed guesses on a
// short code are rate-limited by Convex Auth itself. Until a sending domain is
// verified in Resend, the sender below only delivers to the Resend account's
// own email, which is enough to build and test against.
const SENDER = "CalorieAI <onboarding@resend.dev>";

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() {
    // Rejection sampling keeps all 1,000,000 codes equally likely.
    const limit = 4_294_000_000 - (4_294_000_000 % 1_000_000);
    const buffer = new Uint32Array(1);
    do {
      crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return String(buffer[0] % 1_000_000).padStart(6, "0");
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        subject: "Your CalorieAI reset code",
        text: `Your CalorieAI reset code is ${token}. It expires in 15 minutes. If you didn't ask for it, ignore this email.`,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend rejected the email: ${response.status}`);
    }
  },
});
```

- [ ] **Step 3: Attach it in `convex/auth.ts`**

Add `import { ResendOTP } from "./ResendOTP";` after the existing imports, add `reset: ResendOTP,` as the last key inside the `Password({ ... })` call, and replace the first comment line (`// Email and password only for now. ...` through `// credentials exist.`) with:

```ts
// Email and password, with an emailed code for password reset. Google
// sign-in is added alongside it (see the providers list below).
```

Leave the rest of that comment block (the `profile` and `validatePasswordRequirements` notes) as is.

- [ ] **Step 4: Typecheck**

Run: `cd /d/calorie-ai && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Set the Resend key (user does this)**

Ask the user to run, with their real key, in their own terminal (never paste the key into chat):

```bash
npx convex env set AUTH_RESEND_KEY <paste-your-resend-key>
```

- [ ] **Step 6: Push the backend**

Run: `cd /d/calorie-ai && npx convex dev --once`
Expected: functions deploy without a schema or validation error.

**Checkpoint:** Task 2 completes the manual round trip. No commit.

---

### Task 2: Forgot password screen

**Files:**
- Create: `app/forgotPassword.tsx`
- Modify: `app/signIn.tsx` (add the link and one style)
- Modify: `app/_layout.tsx` (public route and stack screen)

**Interfaces:**
- Consumes: `signIn("password", { email, flow: "reset" })` and `signIn("password", { email, code, newPassword, flow: "reset-verification" })` from Task 1; `emailProblem`, `passwordProblem`, `PASSWORD_RULES` from `convex/validators.ts`.
- Produces: route `/forgotPassword`.

- [ ] **Step 1: Register the route in `app/_layout.tsx`**

Change the constant and add the screen:

```ts
const PUBLIC_ROUTES = ["welcome", "signIn", "forgotPassword"];
```

```tsx
        <Stack.Screen name="signIn" />
        <Stack.Screen name="forgotPassword" />
```

- [ ] **Step 2: Create `app/forgotPassword.tsx`**

```tsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { PressableScale } from "../components/ui/PressableScale";
import { useThemedStyles } from "../components/ThemeProvider";
import { radii, spacing, type, type ThemeColors } from "../constants/theme";
import {
  PASSWORD_RULES,
  emailProblem,
  passwordProblem,
} from "../convex/validators";

// Same redaction story as signIn.tsx: our own ConvexError messages arrive
// intact, everything else is mapped or shown as is.
function readableError(error: unknown, step: "request" | "verify"): string {
  const named = error as { name?: string; data?: unknown } | null;
  if (
    named?.name === "ConvexError" &&
    typeof named.data === "string" &&
    named.data.length > 0
  ) {
    return named.data;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/Server Error|InvalidAccountId|Could not verify code/i.test(message)) {
    return step === "request"
      ? "Couldn't send a code. Check the email address and try again."
      : "That code is wrong or has expired. Check it or ask for a new one.";
  }
  return message;
}

export default function ForgotPasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    const trimmedEmail = email.trim();
    const emailIssue = emailProblem(trimmedEmail);
    if (emailIssue) {
      setError(emailIssue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email: trimmedEmail, flow: "reset" });
      setStep("verify");
    } catch (caught) {
      setError(readableError(caught, "request"));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    const passwordIssue = passwordProblem(newPassword);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", {
        email: email.trim(),
        code: code.trim(),
        newPassword,
        flow: "reset-verification",
      });
      // The root layout's gate routes onward once the session lands.
    } catch (caught) {
      setError(readableError(caught, "verify"));
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PressableScale
            onPress={() =>
              step === "verify"
                ? (setError(null), setStep("request"))
                : router.canGoBack()
                  ? router.back()
                  : router.replace("/signIn")
            }
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back</Text>
          </PressableScale>

          <Text style={styles.title}>Reset your password</Text>

          {step === "request" ? (
            <>
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
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Send code" onPress={requestCode} busy={busy} />
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Code</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </View>
              <View style={styles.rules}>
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <View key={rule.label} style={styles.ruleRow}>
                      <Text
                        style={[styles.ruleMark, met && styles.ruleMarkMet]}
                      >
                        {met ? "✓" : "•"}
                      </Text>
                      <Text
                        style={[styles.ruleText, met && styles.ruleTextMet]}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label="Reset password"
                onPress={resetPassword}
                busy={busy}
              />
              <PressableScale
                scaleTo={0.98}
                onPress={requestCode}
                accessibilityRole="button"
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Send a new code</Text>
              </PressableScale>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.md },
    backButton: { alignSelf: "flex-start", paddingVertical: spacing.xs },
    backText: { ...type.label, color: c.textMuted, fontWeight: "600" },
    title: { ...type.title, color: c.text, marginTop: spacing.sm },
    field: { gap: spacing.xs },
    label: { ...type.label, color: c.textMuted },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 16,
      color: c.text,
    },
    error: { ...type.label, color: c.danger },
    rules: { gap: spacing.xs, marginTop: -spacing.xs },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    ruleMark: {
      ...type.label,
      color: c.textMuted,
      width: 12,
      textAlign: "center",
    },
    ruleMarkMet: { color: c.accent },
    ruleText: { ...type.label, color: c.textMuted },
    ruleTextMet: { color: c.text },
    linkButton: { paddingVertical: spacing.sm, alignItems: "center" },
    linkText: { ...type.label, color: c.accent, textAlign: "center" },
  });
```

- [ ] **Step 3: Add the link in `app/signIn.tsx`**

Directly after the closing `</View>` of the Password field (the one containing `textContentType={mode === "signUp" ? "newPassword" : "password"}`) and before the `{mode === "signUp" ? (` rules block, insert:

```tsx
          {mode === "signIn" ? (
            <PressableScale
              scaleTo={0.98}
              onPress={() => router.push("/forgotPassword")}
              accessibilityRole="button"
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </PressableScale>
          ) : null}
```

and add to `makeStyles`, after `switchText`:

```ts
    forgotButton: { alignSelf: "flex-start", paddingVertical: spacing.xs },
    forgotText: { ...type.label, color: c.accent },
```

- [ ] **Step 4: Typecheck**

Run: `cd /d/calorie-ai && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manual round trip (dev server, `npx expo start`, signed out)**

Use the Resend account's own email as the test account (create a password account with it first).
1. Sign in screen, "Forgot password?" opens the reset screen. It is hidden in sign-up mode.
2. Unknown email, "Send code": plain error, stays on step 1 (Review Focus 1).
3. Real email, "Send code": a 6-digit code arrives, screen moves to step 2.
4. Wrong code plus a valid password: stays on step 2 with the wrong-or-expired message, email kept (Review Focus 2).
5. A weak new password: blocked with the rules message (Review Focus 4).
6. Correct code plus valid password: signed in and routed on. Sign out, sign in with the new password works, old one fails.
7. "Send a new code" delivers a fresh code and the old one stops working.
8. Wait over 15 minutes with an unused code: it fails with the same message (Review Focus 3).

**Checkpoint:** all eight pass. No commit.

---

### Task 3: Backend Google provider

**Files:**
- Modify: `convex/auth.ts`

**Interfaces:**
- Produces: provider id `"google"` accepting `signIn("google", { redirectTo })` (returns `{ redirect }`) and `signIn("google", { code })`. Used by Task 4.

- [ ] **Step 1: Edit `convex/auth.ts`**

Add the import `import Google from "@auth/core/providers/google";` and replace the `convexAuth` call with:

```ts
// The native app returns from the browser to its own scheme. Convex Auth only
// accepts SITE_URL or relative redirects by default, so the app scheme is
// allowed explicitly and nothing else is.
const APP_SCHEME = "calorieai://";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CalorieAIPassword, Google],
  callbacks: {
    async redirect({ redirectTo }) {
      if (redirectTo.startsWith(APP_SCHEME)) return redirectTo;
      throw new Error(`Invalid redirectTo`);
    },
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/calorie-ai && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Google Cloud setup (user does this, in the browser)**

1. console.cloud.google.com, create a project (or use one), then APIs and Services, OAuth consent screen: app name CalorieAI, user type External, add your Gmail as a **test user**.
2. Credentials, Create credentials, OAuth client ID, type **Web application**.
3. Authorised redirect URI: `https://<your-deployment>.convex.site/api/auth/callback/google`. The deployment's HTTP actions URL is on the Convex dashboard (Settings, URL & Deploy Key); never paste the deploy key anywhere.
4. Copy the client ID and secret. Do not paste them into chat.

- [ ] **Step 4: Set the env vars (user does this, in their terminal)**

```bash
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>
npx convex env set SITE_URL calorieai://
```

- [ ] **Step 5: Push the backend**

Run: `cd /d/calorie-ai && npx convex dev --once`
Expected: deploys cleanly.

**Checkpoint:** Task 4 completes the round trip. No commit.

---

### Task 4: Google button in the app

**Files:**
- Modify: `package.json`, `package-lock.json` (via install)
- Modify: `app.json` (plugin entry)
- Modify: `app/signIn.tsx`

**Interfaces:**
- Consumes: `signIn("google", ...)` from Task 3.

- [ ] **Step 1: Install the native module**

Run: `cd /d/calorie-ai && npx expo install expo-web-browser`
Expected: adds a version matched to Expo 54 in `package.json`.

- [ ] **Step 2: Add the config plugin**

In `app.json`, add `"expo-web-browser"` to the `plugins` array, after `"expo-secure-store"`:

```json
      "expo-secure-store",
      "expo-web-browser"
```

- [ ] **Step 3: Add the handler to `app/signIn.tsx`**

Add imports:

```ts
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
```

Add state beside `busy`:

```ts
  const [googleBusy, setGoogleBusy] = useState(false);
```

Add the handler after `submit`:

```ts
  const continueWithGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      const redirectTo = Linking.createURL("/");
      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) throw new Error("Google sign-in didn't start.");
      const result = await openAuthSessionAsync(redirect.toString(), redirectTo);
      // Closing the sheet is a choice, not a failure.
      if (result.type !== "success") return;
      const code = Linking.parse(result.url).queryParams?.code;
      if (typeof code !== "string") {
        setError("Google didn't finish signing you in. Try again.");
        return;
      }
      await signIn("google", { code });
      // The root layout's gate routes onward once the session lands.
    } catch (caught) {
      setError(readableError(caught, "signIn"));
    } finally {
      setGoogleBusy(false);
    }
  };
```

- [ ] **Step 4: Add the button**

After the primary `<Button label={mode === "signUp" ? "Create account" : "Sign in"} ... />`, insert:

```tsx
          <Button
            label="Continue with Google"
            variant="secondary"
            onPress={continueWithGoogle}
            busy={googleBusy}
          />
```

Check `components/ui/Button.tsx` for the actual prop name for the secondary style and use it exactly (the project convention says primary/secondary). Adjust `variant` if the prop is named differently.

- [ ] **Step 5: Typecheck**

Run: `cd /d/calorie-ai && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Build and install a device build**

Run: `cd /d/calorie-ai && npx eas build --platform android --profile preview`
Expected: build finishes, user installs the APK. (This costs a build credit, so confirm with the user before running.)

- [ ] **Step 7: Manual round trips on the device**

1. New Google user (a test user on the consent screen): sign in, routed to onboarding, a new account exists.
2. Cancel the browser sheet: no error banner, button usable again (Review Focus 5).
3. Deny consent on Google's screen: short error, no crash (Review Focus 6).
4. Linking, Google first: use an email that already has an **unverified** password account. Google creates a separate empty account, and the password account is untouched. That email is now spent for the merge test, a later reset will not merge them.
5. Linking, after reset: with a different email that has a password account, run the Task 2 reset (marks it verified) BEFORE ever tapping Google with that email, then tap Google. Expect the same account, with its data.
6. Existing password sign-in still works for an untouched account.

**Checkpoint:** all six pass. No commit.

---

### Task 5: Docs, review, ship notes

**Files:**
- Modify: `README.md`, `PLAN.md`, `AGENTS.md` (only where they describe auth or setup)

- [ ] **Step 1: Update stale markdown**

Search the three files for mentions of auth, sign-in or "email and password only" and update them: Google sign-in and emailed-code reset exist, new env vars (`AUTH_RESEND_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL`) are set on the Convex deployment, the Resend test sender limit and the "verify a domain before launch" step. In `AGENTS.md` conventions, add one line under "Auth and scoping": linking is Convex Auth's default (verified email only), no custom `createOrUpdateUser`. No em dashes.

- [ ] **Step 2: Adversarial review**

Auth changes are on the trigger list. Run up to 3 `opus` agents in parallel on the diff: security (redirect allow-list, reset abuse, code entropy), logic (flow states, linking), error handling (Resend failure, double taps). Fix confirmed findings. Stop and report any `critical` or `high`.

- [ ] **Step 3: `/code-review` at `high`**

Run the local `/code-review` at `high` (auth touched). Resolve findings.

- [ ] **Step 4: Final checks**

Run: `cd /d/calorie-ai && npx tsc --noEmit` then `git status` to confirm no `.env*`, key or secret appears in the diff.

- [ ] **Step 5: Report**

Summarize for the user: what shipped, that the Resend sender only reaches the Resend account email until a domain is verified (one env var plus the `SENDER` constant in `convex/ResendOTP.ts` change then), and ask whether to commit and open a PR.
