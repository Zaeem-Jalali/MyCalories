import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activityValidator, intensityValidator } from "./schema";

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query("exerciseLogs")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
  },
});

export const dailyCaloriesBurned = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_date", (q) => q.eq("date", date))
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
    return await ctx.db.insert("exerciseLogs", args);
  },
});

export const remove = mutation({
  args: { id: v.id("exerciseLogs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
