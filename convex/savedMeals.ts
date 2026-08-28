import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Sorted alphabetically by name via the index — directly answers the
    // "70 saved entries, need to sort alphabetically" review complaint.
    return await ctx.db.query("savedMeals").withIndex("by_name").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("savedMeals", args);
  },
});

export const remove = mutation({
  args: { id: v.id("savedMeals") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
