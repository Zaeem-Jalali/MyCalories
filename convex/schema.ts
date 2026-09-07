import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// A photo-logged meal is one row, with the identified items kept here as the
// breakdown behind it, instead of N separate rows cluttering the daily log.
export const ingredientValidator = v.object({
  name: v.string(),
  quantity: v.number(),
  unit: v.string(),
  calories: v.number(),
  proteinG: v.number(),
  carbsG: v.number(),
  fatG: v.number(),
});

export const activityValidator = v.union(
  v.literal("walk"),
  v.literal("run"),
  v.literal("cycle"),
  v.literal("weights"),
);

export const intensityValidator = v.union(
  v.literal("slow"),
  v.literal("normal"),
  v.literal("brisk"),
);

// Every user-data table is scoped by userId, and every query and mutation
// rejects an unauthenticated call. The field is optional only because rows
// written before auth existed have no owner: those are invisible to every
// account until claimed (see convex/migrations.ts). New rows always set it.
const userId = v.optional(v.id("users"));

export default defineSchema({
  ...authTables,

  profile: defineTable({
    userId,

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
    // Kept so re-opening onboarding to edit an answer recomputes the goals at
    // the pace the user actually chose, instead of silently resetting it.
    rateLbsPerWeek: v.optional(v.number()),
    safetyFloorOverride: v.boolean(),

    name: v.optional(v.string()),

    // Collected during onboarding, used to compute the goals above.
    // Optional so the settings-only path (no onboarding) still works.
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

    // Light or dark. Absent means the user has never chosen, which the app
    // reads as light.
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  }).index("by_user", ["userId"]),

  foodLogs: defineTable({
    userId,
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
    ingredients: v.optional(v.array(ingredientValidator)),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  savedMeals: defineTable({
    userId,
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  weightLogs: defineTable({
    userId,
    date: v.string(), // YYYY-MM-DD
    weightLbs: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  progressPhotos: defineTable({
    userId,
    date: v.string(), // YYYY-MM-DD
    storageId: v.id("_storage"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  exerciseLogs: defineTable({
    userId,
    date: v.string(), // YYYY-MM-DD
    activity: activityValidator,
    // Named "pace" since the walking-only version; it's the shared intensity
    // step now, and renaming it would break every row already logged.
    pace: intensityValidator,
    durationMinutes: v.number(),
    caloriesBurned: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // One row per planned session, either entered by hand or parsed from a
  // photo of a written weekly schedule.
  exercisePlans: defineTable({
    userId,
    dayOfWeek: v.number(), // 0 = Sunday, matching Date.getDay()
    activity: activityValidator,
    durationMinutes: v.number(),
    intensity: intensityValidator,
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_day", ["userId", "dayOfWeek"]),
});
