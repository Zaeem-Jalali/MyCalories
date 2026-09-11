# CalorieAI - Project Plan

## 1. Problem definition

Calorie and nutrition trackers tend to nail the interaction model (a ring-based
calorie/macro dashboard, photo-based logging, streaks, progress photos) and
then undermine it with a shaky foundation: data loss on reinstall, totals that
drift from edits, an AI estimate that ignores actual portion size, and
recommendations that aren't safety-checked. This plan keeps the interaction
model and builds the foundation properly. Backend reliability, data integrity,
and AI accuracy come first.

### Design principles this plan commits to

1. **Local-first, sync-second.** Every write lands on-device immediately and is queued for sync. Nothing is ever lost to a network blip, and app data survives reinstall via account-linked cloud backup (Convex).
2. **Show your math.** Every calorie/macro total is a transparent sum of its line items, always recomputed live. No cached totals that drift from edits.
3. **Explicit portions, always.** The AI estimate always includes a quantity/weight, editable before it's ever logged, never silently assumed as "1 serving."
4. **Streak is derived, never stored as a raw counter.** Computed each time from the actual log history. There is no separate mutable "streak" field that can desync from reality, and it's never monetized.
5. **No dark patterns in billing.** Trial terms and exact charge date/amount shown before payment info is collected, in-app self-serve cancel, no forced questionnaire before you can use the core feature.
6. **Safety floor on recommendations.** Never suggest below a clinically-sane minimum (e.g. 1200 kcal female / 1500 kcal male, configurable and always overridable by the user, with a visible warning if they go lower manually).
7. **Goal-direction agnostic.** Bulking, maintenance, and cutting are equal citizens in copy, scoring, and rewards.

## 2. V1 feature scope (local, personal use)

**In scope:**
- Photo-based food logging (snap, AI identifies ingredients and portion, editable line items, save)
- Barcode scan via free food databases (Open Food Facts) for packaged goods
- Manual food entry and search of a local/synced food database
- Daily dashboard: calories plus protein/carb/fat rings
- Weekly day-strip navigation
- Log food for any date, past or future
- Save/duplicate meals, with sort and filter on saved foods
- Progress tab: weight log (numeric input, not just a fiddly dial), weight chart, derived streak
- Progress photos plus a compare view
- Offline-capable: camera capture and manual logging work with no connection, sync when back online
- Health Connect integration (Android) and Apple Health (iOS) for steps and active-calorie burn
- Basic notification settings with granular per-type toggles, off by default beyond the daily reminder
- Dietary preference field that actually filters suggestions (skip if no "suggested meals" feature ships in V1)

**Explicitly out of scope for V1** (revisit after local use proves the core works):
- Payments/subscriptions of any kind. It's your personal app first.
- Social features, referrals, leaderboards
- AI meal recommendation chat ("what should I eat for dinner")
- Multi-user accounts / sharing

## 3. Architecture

```
┌─────────────────────────────┐
│  React Native (Expo) app    │  iOS + Android, one codebase
│  - UI (rings, camera, chart)│
│  - Local SQLite (via Expo)  │  <- source of truth on-device, works offline
│  - Convex client            │  <- background sync, real-time subscriptions
└──────────────┬───────────────┘
               │ sync (queued, retried)
┌──────────────▼───────────────┐
│  Convex backend               │  functions + database + file storage
│  - mutations/queries (typed)  │
│  - actions: call vision AI    │  <- API key lives server-side, never in the app bundle
│  - scheduled jobs (streak     │
│    recompute, cleanup)        │
└──────────────┬───────────────┘
               │
   ┌───────────┴────────────┐
   │                         │
┌──▼─────────────┐  ┌────────▼────────┐
│ Gemini API      │  │ Open Food Facts  │
│ (food photo →   │  │ (barcode →       │
│ ingredients +   │  │ nutrition data,  │
│ portion + macros)│  │ free, no key)    │
└─────────────────┘  └──────────────────┘
```

**Why this shape holds up:**
- Local SQLite as source of truth plus Convex sync means offline works, and nothing is lost even if the app is deleted and reinstalled (log back in, Convex restores everything).
- The vision API key never ships in the mobile bundle. It's called from a Convex `action`, so it can't be extracted from the APK.
- Streak, daily totals, and macro sums are **computed from source rows on read**, not stored as separately-mutated counters. This eliminates an entire class of "streak reset" and "totals don't match edits" bugs.

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native + Expo, TypeScript | Fast local dev builds on your own phone without touching native Xcode/Android Studio config for most of the build |
| Backend/DB | Convex | Real-time sync, typed functions, file storage (food photos), and scheduled functions out of the box. No separate server to run. |
| AI vision | Gemini API (free tier to start, `gemini-2.5-flash` or current equivalent) | Genuinely free at low volume, swappable later to paid Gemini or Claude via one config value, since the action just calls "the vision provider" |
| Barcode/nutrition DB | Open Food Facts (free, no key) | A global open dataset rather than a narrow regional one |
| Charts | `victory-native` or `react-native-svg`-based charts | A weight-progress line chart, dot per entry |
| Health data | `react-native-health-connect` (Android), `react-native-health` (iOS) | Steps and active-calorie burn on both platforms |

## 5. Data model (sketch, Convex tables)

- `users`: profile, goals (calories/macros target, direction: cut/maintain/bulk), safety-floor override flag
- `foodLogs`: one row per logged item. userId, date, photoUrl?, name, quantity, unit, calories, protein, carbs, fat, source (photo/barcode/manual/saved)
- `savedMeals`: reusable meal templates, tag/category for sort and filter
- `weightLogs`: userId, date, weightLbs
- `progressPhotos`: userId, date, photoUrl
- Daily totals and streaks are **not** stored. They're computed via a Convex query that aggregates `foodLogs`/`weightLogs` for the requested date range.

## 6. Build phases

**Phase 1, Foundation**
Expo app scaffold, Convex project wired up, auth (Convex Auth or Clerk, simple email/password or Google sign-in since it's just you at first), local SQLite plus Convex sync skeleton, basic navigation shell (Home / Progress / Settings tabs).

**Phase 2, Core logging loop**
Manual food entry, food search (Open Food Facts), daily dashboard rings, day-strip date navigation, log-for-any-date.

**Phase 3, AI photo logging**
Camera capture screen, Convex action calling Gemini, ingredient-labeled result screen with editable line items, portion/quantity always explicit.

**Phase 4, Barcode scanning**
Barcode capture, Open Food Facts lookup, same editable-result flow as photo logging.

**Phase 5, Progress**
Weight log plus chart, derived streak display, progress photo capture plus compare view.

**Phase 6, Reliability and polish**
Offline queue testing (airplane-mode logging, reconnect sync), health platform integration, notification settings, saved-meal sort/filter, safety-floor guardrail on calorie targets, accessibility pass (contrast, dynamic type).

## 7. Local launch (no store involved)

1. `npx create-expo-app` inside `D:\calorie-ai`, TypeScript template.
2. `npx convex dev` to spin up your Convex backend (free tier).
3. Get a free Gemini API key from Google AI Studio, store it as a Convex environment variable (`GEMINI_API_KEY`), never in the app code.
4. Run the app on your own phone via Expo Go during early development, then an Expo **development build** once you add native modules (Health Connect, camera) that Expo Go can't support.
5. Use it daily yourself as the real test. The whole point of local-first is you don't need a store listing to dogfood it.

## 8. Play Store path (once you're happy with it locally)

1. Set up an EAS (Expo Application Services) account, configure `eas.json` build profiles.
2. `eas build --platform android` for a signed release AAB.
3. Google Play Console: create app listing, complete the **Data Safety form** honestly (photos, health/fitness data, weight; this is a review flag area, must be accurate), privacy policy page (can be a simple static page, required since this handles health data), content rating questionnaire.
4. Internal testing track first (your own account only), then closed testing (a few friends), then production.
5. If you later add iOS: Apple Developer Program ($99/yr), TestFlight beta, App Store Review (health apps get extra scrutiny; the Apple Health entitlement needs a clear justification in the review notes).
6. Only at this stage would monetization (subscriptions, IAP) come back into scope, and only if you decide the app is worth pursuing commercially. Not part of V1.

## Verification along the way
- Each build phase should be usable end-to-end on your own phone before moving to the next (log a real meal, see it reflected correctly in totals and progress).
- Before Play Store submission: airplane-mode test (log food offline, reconnect, confirm sync), reinstall test (confirm Convex restores all data), and a manual streak-accuracy check across several real days.
