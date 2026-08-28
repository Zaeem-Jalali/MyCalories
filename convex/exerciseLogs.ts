import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activityValidator, intensityValidator } from "./schema";
import { requireUserId } from "./users";

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .collect();
  },
});

export const dailyCaloriesBurned = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .collect();
    return logs.reduce((total, log) => total + log.caloriesBurned, 0);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    activity: activityValidator,
    pace: intensityValidator,
    durationMinutes: v.number(),
    caloriesBurned: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("exerciseLogs", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("exerciseLogs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const log = await ctx.db.get(id);
    if (!log || log.userId !== userId) {
      throw new Error("Exercise log not found");
    }
    await ctx.db.delete(id);
  },
});
