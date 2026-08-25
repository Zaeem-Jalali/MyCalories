import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// V1 is single-user/local, so there is no per-row userId yet.
// Auth + multi-user scoping gets added when we wire up sign-in (Phase 1 follow-up).
export default defineSchema({
  profile: defineTable({
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
  }),

  foodLogs: defineTable({
    date: v.string(), // YYYY-MM-DD, lets us log for any past/future date
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
  }).index("by_date", ["date"]),

  savedMeals: defineTable({
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
  }).index("by_name", ["name"]),

  weightLogs: defineTable({
    date: v.string(), // YYYY-MM-DD
    weightLbs: v.number(),
  }).index("by_date", ["date"]),

  progressPhotos: defineTable({
    date: v.string(), // YYYY-MM-DD
    storageId: v.id("_storage"),
  }).index("by_date", ["date"]),
});
