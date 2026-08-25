import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("weightLogs").withIndex("by_date").collect();
  },
});

export const logWeight = mutation({
  args: { date: v.string(), weightLbs: v.number() },
  handler: async (ctx, { date, weightLbs }) => {
    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_date", (q) => q.eq("date", date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { weightLbs });
      return existing._id;
    }
    return await ctx.db.insert("weightLogs", { date, weightLbs });
  },
});
