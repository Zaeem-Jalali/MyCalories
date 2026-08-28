import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activityValidator, intensityValidator } from "./schema";

const planEntry = v.object({
  dayOfWeek: v.number(),
  activity: activityValidator,
  durationMinutes: v.number(),
  intensity: intensityValidator,
  notes: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("exercisePlans").withIndex("by_day").collect();
  },
});

export const listByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, { dayOfWeek }) => {
    return await ctx.db
      .query("exercisePlans")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .collect();
  },
});

// A parsed schedule replaces the whole week rather than merging, so a
// re-upload of a corrected photo doesn't leave stale sessions behind.
export const replaceAll = mutation({
  args: { entries: v.array(planEntry) },
  handler: async (ctx, { entries }) => {
    const existing = await ctx.db.query("exercisePlans").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const entry of entries) {
      await ctx.db.insert("exercisePlans", entry);
    }
    return entries.length;
  },
});

export const remove = mutation({
  args: { id: v.id("exercisePlans") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
