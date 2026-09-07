import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

// Clinically-sane floor: never let a computed/edited goal drop below this
// without an explicit override, so we don't repeat the "736 kcal/day
// recommended" complaint from the reviews.
const MIN_SAFE_CALORIES = 1200;

// The one read that tolerates being signed out: the root layout uses it to
// decide between the sign-in screen, onboarding and the tabs, so it has to
// answer before there is a session.
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("profile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
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
    rateLbsPerWeek: v.optional(v.number()),
    safetyFloorOverride: v.boolean(),
    name: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("male"), v.literal("female"))),
    age: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("light"),
        v.literal("moderate"),
        v.literal("active"),
        v.literal("very_active"),
      ),
    ),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!args.safetyFloorOverride && args.calorieGoal < MIN_SAFE_CALORIES) {
      throw new Error(
        `Calorie goal is below the safe minimum of ${MIN_SAFE_CALORIES}. Enable safetyFloorOverride to set it anyway.`,
      );
    }

    const existing = await ctx.db
      .query("profile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("profile", { ...args, userId });
  },
});

// Kept separate from `upsert` so switching theme never runs the goal
// recompute or the safety-floor check.
export const setTheme = mutation({
  args: { theme: v.union(v.literal("light"), v.literal("dark")) },
  handler: async (ctx, { theme }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("profile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) {
      throw new Error(
        "No profile yet. Finish onboarding before setting a theme.",
      );
    }
    await ctx.db.patch(existing._id, { theme });
  },
});
