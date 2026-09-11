# CalorieAI

A calorie and nutrition tracker for Android and iOS. Photograph a meal and an
AI vision model estimates the ingredients and portions. Scan a barcode or a
nutrition label for packaged food. Log manually when you just need to type a
number. Every estimate is reviewed and editable before it's saved, every
total is computed live from the logged rows, and a derived streak means
there's nothing that can silently reset or desync from your actual history.

## Features

- **Photo logging.** Snap a plate and get an editable per-item breakdown of
  calories, protein, carbs, and fat, with a portion stepper that scales the
  macros proportionally.
- **Barcode and label scanning.** Looks up packaged food in a global open
  nutrition database, with a fallback that reads a printed label directly
  when a product isn't listed.
- **Manual entry and search.** A plain form, or a text search against the
  same nutrition database.
- **Saved meals.** Save any logged meal (from a photo, a barcode, or by hand)
  and re-log it in one tap.
- **Home dashboard.** A 7-day day strip, a calorie card against your goal,
  three macro cards, and the day's food log.
- **Exercise logging.** Walk, run, cycle, or weights, with a MET-based
  calorie-burn estimate. A photo of a handwritten weekly schedule can be
  parsed into a full week of planned sessions.
- **Progress tracking.** Weight log with a history chart, progress photos
  with a side-by-side compare view, and a streak derived from your actual
  logged days.
- **Monthly report.** A written summary of the month generated from your real
  numbers. The model is never given a figure it could restate incorrectly,
  only the shape of the month in words.
- **Light and dark themes.**
- **Accounts.** Email and password auth, with every user's data isolated
  server-side.

## Tech stack

| Layer | Choice |
|---|---|
| App | React Native (Expo SDK 54), TypeScript, Expo Router |
| Backend | [Convex](https://convex.dev), database, typed functions, file storage |
| Auth | `@convex-dev/auth`, email and password |
| AI vision and text | Google Gemini, called only from Convex server actions |
| Nutrition data | [Open Food Facts](https://world.openfoodfacts.org), a free and open product database |
| Charts and the app mark | `react-native-svg` |
| Native builds and OTA updates | EAS (Expo Application Services) |

## Project structure

```
app/            expo-router screens (one file per route)
components/     shared UI and the feature tabs (photo, barcode, etc.)
constants/      design tokens (color, spacing, type)
lib/            framework-free helpers (dates, goal math, image prep)
convex/         backend: schema, queries, mutations, and the Gemini actions
```

## Getting started

### Prerequisites

- Node.js and npm
- A [Convex](https://convex.dev) account (the free tier is enough for local use)
- A [Gemini API key](https://aistudio.google.com) (the free tier is enough
  for personal use)
- The [Expo Go](https://expo.dev/go) app, or a development build, for testing
  on a physical device

### Setup

```bash
npm install

# Starts the Convex dev deployment and writes EXPO_PUBLIC_CONVEX_URL
# into .env.local
npx convex dev

# In the Convex dashboard, or via the CLI, set your Gemini key
npx convex env set GEMINI_API_KEY <your-key>
```

### Run

```bash
npx expo start          # scan the QR code with Expo Go
npx expo start --web    # web preview, signed-out screens only
```

## Shipping

Builds and over-the-air updates go through EAS. A JS-only change ships with
`eas update`. A native change (a new native module, or anything touching
`app.json` plugins or permissions) needs a fresh `eas build`. See
`AGENTS.md` for the exact commands and the gotchas around keeping an OTA
update matched to the installed build's runtime fingerprint.

## License

No license has been set yet. All rights reserved unless a license is added.
