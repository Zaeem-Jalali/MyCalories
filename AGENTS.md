# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Shipping to the phone

- **JS-only change:** `eas update --branch preview` pushes it over the air to the installed app. No reinstall. The app picks it up on the next cold start.
- **Native change** (a new `expo-*` or `react-native-*` package, anything touching `app.json` plugins or permissions): needs `eas build`. `runtimeVersion` uses the `fingerprint` policy, so the fingerprint changes automatically and an over-the-air update can never land on a build that lacks the native module. Check with `eas fingerprint:generate --platform android`; if it differs from the installed build's, rebuild.
- **`eas update` rewrites `app.json`.** Its expo-config autofix silently adds `ios.runtimeVersion` and duplicates the Android `permissions` entries mid-command. The `ios.runtimeVersion` line changes the computed **Android** fingerprint, so the published update no longer matches the installed APK and the phone quietly ignores it. Always run `eas update --branch preview --platform android`, then confirm the output's `Runtime version` is the installed build's fingerprint (`563761c1…` for the build from commit `90c4ce3`) before trusting it, and `git checkout -- app.json` afterward. Verify locally first with `node -e "require('@expo/fingerprint').createFingerprintAsync(process.cwd(),{platforms:['android']}).then(fp=>console.log(fp.hash))"`.
- **The dev deployment is shared with whatever is already installed.** Changing a Convex function signature or adding an auth requirement breaks every installed build immediately, before any rebuild. Ship the app update alongside a breaking backend change, or the phone stops working while the code looks fine.

# Conventions

- **UI.** `constants/theme.ts` owns every colour, radius, spacing step, type role and duration. Never write a raw pixel value into a stylesheet, and never introduce a colour outside the tokens. Colour is themed: `theme.ts` exports `lightColors` and `darkColors` (same `ThemeColors` shape); components never import a palette directly, they read `const { colors } = useTheme()` from `components/ThemeProvider.tsx`, and colour-dependent styles go in a module-level `const makeStyles = (c: ThemeColors) => StyleSheet.create({...})` fed through `useThemedStyles(makeStyles)`. The active mode lives on `profile.theme` (`profile.setTheme` mutation), cached on-device in `lib/themeCache.ts` for the pre-network launch frame, and toggled from the Appearance card in Settings. The logo mark keeps fixed brand colours (`lightColors` + `accentOnInk`), it does not follow the app theme. Shared controls live in `components/ui/`: `Button` (primary/secondary, with busy and disabled states), `Chip` (every selectable option in the app), `EmptyState`, `ProgressTrack`, `PressableScale` (press feedback on anything tappable) and `motion.tsx` (`FadeInUp`, `useBumpOnChange`, `useReducedMotion`). Use them rather than rebuilding a `TouchableOpacity` with local styles.
- **Numbers.** Any figure the user reads gets `...tabular` from the theme, so digits keep a fixed width.
- **Voice.** Sentence case everywhere. Buttons name the action ("Save goals", not "Save"). No em dashes anywhere, including comments.
- **Dates.** Every date is a `YYYY-MM-DD` calendar day in the user's own timezone. Always build and parse keys with `lib/dateKey.ts` (`toDateKey`, `todayKey`, `dateFromKey`). Never use `toISOString().slice(0, 10)`, it shifts the day for anyone east of UTC.
- **Auth and scoping.** Every user-data table carries `userId` and is read through a `by_user*` index. Every query and mutation that touches user data starts with `requireUserId(ctx)` from `convex/users.ts`, which throws when there is no session. `profile.get` and `users.current` are the only reads allowed to answer while signed out, because the root layout's gate needs them. Rows written before accounts existed have no `userId` and are invisible to every account. `convex/migrations.ts` can hand them to one account, and is internal-only (CLI) on purpose: as public mutations, any account could have claimed that history as its own.
- **The monthly review.** Gemini is never given a figure it could restate wrongly. `convex/monthlyReport.ts` sends the shape of the month in words (trend, consistency, food names) and refuses a review containing digits. Every number on screen comes from the `summary` query.
- **Photo meals.** A photo-logged meal is one `foodLogs` row with the identified items in its `ingredients` array, not one row per ingredient. The breakdown is shown in `app/mealDetail.tsx`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
