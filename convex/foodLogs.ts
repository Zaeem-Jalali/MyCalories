import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query("foodLogs")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
  },
});

export const dailyTotals = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Always summed live from the logged rows, never a stored/cached total,
    // so an edited line item is immediately reflected here.
    return logs.reduce(
      (totals, log) => ({
        calories: totals.calories + log.calories,
        proteinG: totals.proteinG + log.proteinG,
        carbsG: totals.carbsG + log.carbsG,
        fatG: totals.fatG + log.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
    source: v.union(
      v.literal("photo"),
      v.literal("barcode"),
      v.literal("manual"),
      v.literal("saved"),
    ),
    photoStorageId: v.optional(v.id("_storage")),
    savedMealId: v.optional(v.id("savedMeals")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foodLogs", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("foodLogs"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    calories: v.optional(v.number()),
    proteinG: v.optional(v.number()),
    carbsG: v.optional(v.number()),
    fatG: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("foodLogs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
