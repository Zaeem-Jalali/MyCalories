import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Clinically-sane floor: never let a computed/edited goal drop below this
// without an explicit override, so we don't repeat the "736 kcal/day
// recommended" complaint from the reviews.
const MIN_SAFE_CALORIES = 1200;

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profile").first();
  },
});

export const upsert = mutation({
  args: {
    calorieGoal: v.number(),
    proteinGoalG: v.number(),
    carbsGoalG: v.number(),
    fatGoalG: v.number(),
    goalDirection: v.union(
      v.literal("cut"),
      v.literal("maintain"),
      v.literal("bulk"),
    ),
    weightGoalLbs: v.optional(v.number()),
    safetyFloorOverride: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.safetyFloorOverride && args.calorieGoal < MIN_SAFE_CALORIES) {
      throw new Error(
        `Calorie goal is below the safe minimum of ${MIN_SAFE_CALORIES}. Enable safetyFloorOverride to set it anyway.`,
      );
    }

    const existing = await ctx.db.query("profile").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("profile", args);
  },
});
