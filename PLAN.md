# CalorieAI — Project Plan

## 1. Problem definition

Built from 99 Google Play reviews of Cal AI (4.4★, 272K ratings) and its screenshots. The UI/UX pattern (ring-based calorie/macro tracking, photo-based logging, streaks, progress photos) is well liked — reviewers keep saying "great UI" even in 1-star reviews. The failures are almost entirely **backend reliability, data integrity, billing transparency, and AI accuracy**, not the interface concept. So we keep the interaction model, and fix everything underneath it.

### Recurring complaints, ranked by how often/how strongly they show up

| # | Problem | Evidence |
|---|---|---|
| 1 | **Deceptive trial billing** — charged immediately or mid-trial despite "free trial" messaging, no refunds | Reviews: Sulaiman, Rieuna, Kaity, Nazar, Netta B, S Hn, Faizan |
| 2 | **Data loss** — full profile/history wiped on reinstall, sign-out, or randomly, no reliable cloud backup | Ashlie, Lorena, Angel, Tremaine, Andrea, Louis |
| 3 | **Portion size ignored** — AI logs "1 serving" regardless of actual quantity in the photo | Carlos, Joseph, Kyle |
| 4 | **Math doesn't add up** — edits don't persist, totals don't match logged items, ~30-60% error rate reported | Miah, Kayla Stern, Mathew, Jorge, Raymond, Alan |
| 5 | **Streak logic is broken** — resets despite consistent logging; app charges $1 to "restore" a broken streak | Jeffrie, J W, Janon, Gunleik, Ema, Daniel, Wesley, Ryan, Tonioss22 |
| 6 | **Performance degrades over time** — app gets slow/laggy after weeks of use, especially search | Sofya, Raymond, Adrian, Tim, Yuri |
| 7 | **No offline support** — can't even take a photo without a live connection | Erik, Gibbs C |
| 8 | **No health-platform sync on Android** — no Health Connect / Google Fit / Fitbit / Samsung Health integration | Robert, C. Andrew, Winston, Hannah |
| 9 | **Notification spam, no granularity** — "Susie lost 15 lbs" style pushes, all-or-nothing toggle | Clare, Parris, Walter |
| 10 | **Unsafe calorie targets** — recommended as low as 736 kcal/day with no safety floor | Sophie |
| 11 | **No support for weight-gain goals** — only rewards calorie deficit, punishes surplus | Injectable Bacon |
| 12 | **Dietary preferences ignored** — kept suggesting pork after user opted out; no allergy/medical-condition awareness | S Hn, Dawn HappyHand |
| 13 | Misc UX gaps | can't log future/past dates, no meal duplication, no saved-food sort/filter, imprecise weight-entry dial, date-picker off-by-one, white-on-white contrast bug, "protein = meat leg" icon |

### Design principles this plan commits to

1. **Local-first, sync-second.** Every write lands on-device immediately and is queued for sync — nothing is ever lost to a network blip, and app data survives reinstall via account-linked cloud backup (Convex), so we directly kill complaint #2.
2. **Show your math.** Every calorie/macro total is a transparent sum of its line items, always recomputed live — no cached totals that drift from edits (kills #4).
3. **Explicit portions, always.** The AI estimate always includes a quantity/weight, editable before it's ever logged, never silently assumed as "1 serving" (kills #3).
4. **Streak is derived, never stored as a raw counter.** Computed each time from the actual log history — there is no separate mutable "streak" field that can desync from reality, and it's never monetized (kills #5, #9's worst offender... actually #5's fee gimmick specifically).
5. **No dark patterns in billing.** Trial terms and exact charge date/amount shown before payment info is collected; in-app self-serve cancel; no forced questionnaire before you can use the core feature (kills #1).
6. **Safety floor on recommendations.** Never suggest below a clinically-sane minimum (e.g. 1200 kcal female / 1500 kcal male, configurable and always overridable by the user, with a visible warning if they go lower manually) (kills #10).
7. **Goal-direction agnostic.** Bulking/maintenance/cutting are equal citizens in copy, scoring, and rewards (kills #11).

## 2. V1 feature scope (local, personal use)

**In scope:**
- Photo-based food logging (snap → AI identifies ingredients + portion → editable line items → save)
- Barcode scan via free food databases (Open Food Facts) for packaged goods
- Manual food entry + search of a local/synced food database
- Daily dashboard: calories + protein/carb/fat rings, matching the reviewed screenshot layout
- Weekly day-strip navigation
- Log food for any date (past or future) — explicitly fixes complaint #13
- Save/duplicate meals, with sort & filter on saved foods
- Progress tab: weight log (numeric input, not just a fiddly dial), weight chart, derived streak
- Progress photos + compare view
- Offline-capable: camera capture and manual logging work with no connection, sync when back online
- Health Connect integration (Android) / Apple Health (iOS) for steps & active-calorie burn
- Basic notification settings with granular per-type toggles, off by default beyond daily reminder
- Dietary preference field that actually filters suggestions (skip if no "suggested meals" feature ships in V1)

**Explicitly out of scope for V1** (revisit after local use proves the core works):
- Payments/subscriptions of any kind — it's your personal app first
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

**Why this shape fixes the review complaints directly:**
- Local SQLite as source of truth + Convex sync = offline works, and nothing is lost even if the app is deleted and reinstalled (log back in, Convex restores everything).
- Vision API key never ships in the mobile bundle — it's called from a Convex `action`, so it can't be extracted from the APK.
- Streak, daily totals, and macro sums are **computed from source rows on read**, not stored as separately-mutated counters — eliminates the entire class of "streak reset" and "totals don't match edits" bugs.

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native + Expo, TypeScript | Your default mobile stack; Expo gives you fast local dev builds on your own phone without touching native Xcode/Android Studio config for most of the build |
| Backend/DB | Convex | Your default DB; gives real-time sync, typed functions, file storage (food photos), and scheduled functions out of the box — no separate server to run |
| AI vision | Gemini API (free tier to start, `gemini-2.5-flash` or current equivalent) | Genuinely free at low volume; swappable later to paid Gemini or Claude via one config value, since the action just calls "the vision provider" |
| Barcode/nutrition DB | Open Food Facts (free, no key) | Avoids the "food database missing my country's products" complaint by using a global open dataset |
| Charts | `victory-native` or `react-native-svg`-based charts | Matches the weight-progress line chart in the reviewed screenshots |
| Health data | `react-native-health-connect` (Android), `react-native-health` (iOS) | Fixes complaint #8 directly |

## 5. Data model (sketch, Convex tables)

- `users` — profile, goals (calories/macros target, direction: cut/maintain/bulk), safety-floor override flag
- `foodLogs` — one row per logged item: userId, date, photoUrl?, name, quantity, unit, calories, protein, carbs, fat, source (photo/barcode/manual/saved)
- `savedMeals` — reusable meal templates, tag/category for sort+filter
- `weightLogs` — userId, date, weightLbs
- `progressPhotos` — userId, date, photoUrl
- Daily totals and streaks are **not** stored — computed via a Convex query that aggregates `foodLogs`/`weightLogs` for the requested date range.

## 6. Build phases

**Phase 1 — Foundation**
Expo app scaffold, Convex project wired up, auth (Convex Auth or Clerk — simple email/password or Google sign-in since it's just you at first), local SQLite + Convex sync skeleton, basic navigation shell (Home / Progress / Settings tabs matching the reviewed layout).

**Phase 2 — Core logging loop**
Manual food entry, food search (Open Food Facts), daily dashboard rings, day-strip date navigation, log-for-any-date.

**Phase 3 — AI photo logging**
Camera capture screen (matches "Just snap a pic" flow), Convex action calling Gemini, ingredient-labeled result screen with editable line items ("See the calories" + "Fix Results" flow), portion/quantity always explicit.

**Phase 4 — Barcode scanning**
Barcode capture, Open Food Facts lookup, same editable-result flow as photo logging.

**Phase 5 — Progress**
Weight log + chart, derived streak display, progress photo capture + compare view.

**Phase 6 — Reliability & polish**
Offline queue testing (airplane-mode logging, reconnect sync), health platform integration, notification settings, saved-meal sort/filter, safety-floor guardrail on calorie targets, accessibility pass (contrast, dynamic type).

## 7. Local launch (no store involved)

1. `npx create-expo-app` inside `D:\calorie-ai`, TypeScript template.
2. `npx convex dev` to spin up your Convex backend (free tier).
3. Get a free Gemini API key from Google AI Studio, store it as a Convex environment variable (`GEMINI_API_KEY`) — never in the app code.
4. Run the app on your own phone via Expo Go during early development, then an Expo **development build** once you add native modules (Health Connect, camera) that Expo Go can't support.
5. Use it daily yourself as the real test — the whole point of local-first is you don't need a store listing to dogfood it.

## 8. Play Store path (once you're happy with it locally)

1. Set up an EAS (Expo Application Services) account, configure `eas.json` build profiles.
2. `eas build --platform android` for a signed release AAB.
3. Google Play Console: create app listing, complete the **Data Safety form** honestly (photos, health/fitness data, weight — this is a review flag area, must be accurate), privacy policy page (can be a simple static page, required since this handles health data), content rating questionnaire.
4. Internal testing track first (your own account only) → closed testing (a few friends) → production.
5. If you later add iOS: Apple Developer Program ($99/yr), TestFlight beta, App Store Review (health apps get extra scrutiny — Apple Health entitlement needs a clear justification in the review notes).
6. Only at this stage would monetization (subscriptions, IAP) come back into scope, and only if you decide the app is worth pursuing commercially — not part of V1.

## Verification along the way
- Each build phase should be usable end-to-end on your own phone before moving to the next (log a real meal, see it reflected correctly in totals and progress).
- Before Play Store submission: airplane-mode test (log food offline, reconnect, confirm sync), reinstall test (confirm Convex restores all data), and a manual streak-accuracy check across several real days.
