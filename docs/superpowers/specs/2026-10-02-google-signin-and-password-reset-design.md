# Google sign-in and password reset

## Goal
Let users sign in with Google, and reset a forgotten password with a 6-digit code sent by email. Existing email and password accounts keep working.

## Constraints
- Stay on Convex Auth (`@convex-dev/auth`), extending `convex/auth.ts`.
- No sending domain yet. Resend's test sender is used until a domain is verified.
- Google needs the new native module `expo-web-browser`, so one `eas build` is required. Backend changes are additive, so installed builds keep working until then.
- Follow project conventions: theme tokens, `Button`/`PressableScale`, sentence case, no em dashes, no helper text under headings.

## 1. Google sign-in
**Backend**
- Add `Google` from `@auth/core/providers/google` to `providers` in `convex/auth.ts`.
- Add `callbacks.redirect` so the `calorieai://` scheme is an allowed redirect target.
- Deployment env vars: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL`. `SITE_URL` is required for password reset too: Convex Auth calls `siteUrl()` on every reset request, so reset fails without it even if Google is never used.

**Google Cloud**
- One **Web** OAuth client. Authorised redirect URI: `https://<deployment>.convex.site/api/auth/callback/google`.
- Consent screen stays in Testing (test users only) until published.

**App**
- "Continue with Google" button on `app/signIn.tsx`.
- Flow: `signIn("google", { redirectTo })`, open the returned URL with `openAuthSessionAsync`, read `code` from the returned `calorieai://` URL, then `signIn("google", { code })`.
- Add `expo-web-browser` (npm install via `npx expo install`).

## 2. Forgot password
**Backend**
- New `convex/ResendOTP.ts`: email provider, 6-digit numeric code, 15 minute expiry, sends through Resend.
- Attach it as `reset` on the existing `CalorieAIPassword` provider. The server-side `validatePasswordRequirements` already covers the new password.
- Deployment env var: `AUTH_RESEND_KEY`. Sender is Resend's test address until a domain is verified.

**App**
- "Forgot password?" link on the sign-in screen (sign-in mode only).
- New screen `app/forgotPassword.tsx`, two steps:
  1. Email, "Send code" (`signIn("password", { email, flow: "reset" })`).
  2. Code and new password with `PASSWORD_RULES`, "Reset password" (`flow: "reset-verification"`). Success signs the user in.
- Errors go through the same readable-error approach as `signIn.tsx`. The server cannot tell a wrong code from an expired one, so both get one message that suggests checking the code or asking for a new one.

## 3. Account linking
Use Convex Auth's default linking. No custom `createOrUpdateUser` hook. Read from the library source (`users.js`): a Google sign-in links into an existing user only when that user's email is **verified** (`emailVerificationTime` set).
- Safe by default: an attacker who pre-registers a victim's email with a password is never linked to the victim's later Google sign-in, because the attacker's account is unverified.
- Consequence: today's password accounts are unverified, so an existing password user who taps Google for the first time gets a **separate, empty account**. Completing a password reset marks the email verified (`reset-verification` sets `emailVerificationTime`), after which Google links to the same account.
- Accepted for now. Existing users keep using their password. If merging is wanted later, it needs its own design (email verification at sign-up).
- Confirmed by a real test during implementation (see Verification).

## 4. Out of scope
- Apple sign-in, magic links, email change, a verified sending domain, publishing the Google consent screen.

## 5. Verification
- `npx tsc --noEmit` clean.
- Real round trips on a device build: Google sign-in as a new user, Google sign-in with an email that has an unverified password account (expect a separate account), reset with a real emailed code, wrong code, expired code, password rules enforced on reset.
- Adversarial review (auth), then `/code-review` at high.

Linking test order: to see "same account after a reset", use a different email than the one above and complete the reset BEFORE ever tapping Google with it. If Google is tapped first, a separate empty account is created and a later reset will not merge them.

## Follow-ups
- Rate limit on reset requests (email bombing).
- Android App Links instead of the custom scheme.
- Account enumeration on the reset screen.
- Stale access tokens after a reset.

## 6. Shipping
- `eas build` for Android (native module added), then `eas update --platform android` for later JS changes, per AGENTS.md.
- New env vars set on the Convex deployment, never committed.

## Update 2026-10-04: password reset removed

The emailed reset code (Resend) was dropped because the project has no email service. The forgot password screen, `convex/ResendOTP.ts` and the Resend env var are gone. Only Google sign-in remains. Password accounts are never email-verified, so Google always creates its own account and never links into a password one. Everything above about reset, `reset-verification` and linking after a reset no longer applies. The plan file for this work is superseded to the same extent.
