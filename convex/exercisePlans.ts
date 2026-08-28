import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { activityValidator, intensityValidator } from "./schema";
import { requireUserId } from "./users";

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
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("exercisePlans")
      .withIndex("by_user_and_day", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, { dayOfWeek }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("exercisePlans")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", userId).eq("dayOfWeek", dayOfWeek),
      )
      .collect();
  },
});

// A parsed schedule replaces the whole week rather than merging, so a
// re-upload of a corrected photo doesn't leave stale sessions behind.
export const replaceAll = mutation({
  args: { entries: v.array(planEntry) },
  handler: async (ctx, { entries }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("exercisePlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const entry of entries) {
      await ctx.db.insert("exercisePlans", { ...entry, userId });
    }
    return entries.length;
  },
});

export const remove = mutation({
  args: { id: v.id("exercisePlans") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const plan = await ctx.db.get(id);
    if (!plan || plan.userId !== userId) {
      throw new Error("Planned session not found");
    }
    await ctx.db.delete(id);
  },
});
