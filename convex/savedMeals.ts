import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // Sorted alphabetically by name via the index — directly answers the
    // "70 saved entries, need to sort alphabetically" review complaint.
    return await ctx.db
      .query("savedMeals")
      .withIndex("by_user_and_name", (q) => q.eq("userId", userId))
      .collect();
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
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("savedMeals", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("savedMeals") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const meal = await ctx.db.get(id);
    if (!meal || meal.userId !== userId) {
      throw new Error("Saved meal not found");
    }
    await ctx.db.delete(id);
  },
});
