# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Conventions

- **Dates.** Every date is a `YYYY-MM-DD` calendar day in the user's own timezone. Always build and parse keys with `lib/dateKey.ts` (`toDateKey`, `todayKey`, `dateFromKey`). Never use `toISOString().slice(0, 10)`, it shifts the day for anyone east of UTC.
- **Auth and scoping.** Every user-data table carries `userId` and is read through a `by_user*` index. Every query and mutation that touches user data starts with `requireUserId(ctx)` from `convex/users.ts`, which throws when there is no session. `profile.get` and `users.current` are the only reads allowed to answer while signed out, because the root layout's gate needs them. Rows written before accounts existed have no `userId` and are invisible to every account. `convex/migrations.ts` can hand them to one account, and is internal-only (CLI) on purpose: as public mutations, any account could have claimed that history as its own.
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
