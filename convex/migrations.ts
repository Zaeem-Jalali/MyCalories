import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Rows written before accounts existed have no userId, so no account can see
// them. Rather than delete that history, it can be handed to one account.
//
// These are INTERNAL on purpose. As public mutations any account that signed
// up could have claimed the pre-auth data as its own, permanently, which is
// the opposite of what adding accounts was for. They run from the CLI only:
//   npx convex run migrations:countUnclaimed
//   npx convex run migrations:claimUnclaimed '{"userId":"<id from users table>"}'
const LEGACY_TABLES = [
  "profile",
  "foodLogs",
  "savedMeals",
  "weightLogs",
  "progressPhotos",
  "exerciseLogs",
  "exercisePlans",
] as const;

export const countUnclaimed = internalQuery({
  args: {},
  handler: async (ctx) => {
    let total = 0;
    for (const table of LEGACY_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", undefined))
        .collect();
      total += rows.length;
    }
    return total;
  },
});

// The inverse, for undoing a claim made against the wrong account. Rows go
// back to having no owner rather than being deleted, and only rows that
// predate the account are touched: anything the account logged itself is
// genuinely its own and must not be orphaned.
export const releaseClaimed = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("No such user");
    }
    const accountCreatedAt = user._creationTime;

    let released = 0;
    for (const table of LEGACY_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        if (row._creationTime >= accountCreatedAt) continue;
        await ctx.db.patch(row._id, { userId: undefined });
        released += 1;
      }
    }
    return released;
  },
});

export const claimUnclaimed = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("No such user");
    }

    // A profile is one per account, so an existing one is not overwritten by
    // a claimed legacy profile.
    const existingProfile = await ctx.db
      .query("profile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let claimed = 0;
    for (const table of LEGACY_TABLES) {
      if (table === "profile" && existingProfile) continue;
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", undefined))
        .collect();
      for (const row of rows) {
        await ctx.db.patch(row._id, { userId });
        claimed += 1;
      }
    }
    return claimed;
  },
});
