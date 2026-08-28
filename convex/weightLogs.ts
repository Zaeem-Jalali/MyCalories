import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("weightLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const logWeight = mutation({
  args: { date: v.string(), weightLbs: v.number() },
  handler: async (ctx, { date, weightLbs }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { weightLbs });
      return existing._id;
    }
    return await ctx.db.insert("weightLogs", { userId, date, weightLbs });
  },
});
