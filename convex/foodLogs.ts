import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { ingredientValidator } from "./schema";
import { requireUserId } from "./users";

// Ownership is re-checked on every write by id, so a guessed or stale id from
// another account is rejected rather than quietly patched or deleted.
async function ownedLog(
  ctx: MutationCtx,
  id: Id<"foodLogs">,
  userId: Id<"users">,
): Promise<Doc<"foodLogs">> {
  const log = await ctx.db.get(id);
  if (!log || log.userId !== userId) {
    throw new Error("Food log not found");
  }
  return log;
}

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .collect();

    // The list renders a thumbnail for photo-logged meals, so the signed URL
    // has to come back with the row rather than in a per-row follow-up query.
    return await Promise.all(
      logs.map(async (log) => ({
        ...log,
        photoUrl: log.photoStorageId
          ? await ctx.storage.getUrl(log.photoStorageId)
          : null,
      })),
    );
  },
});

export const get = query({
  args: { id: v.id("foodLogs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const log = await ctx.db.get(id);
    if (!log || log.userId !== userId) return null;
    return {
      ...log,
      photoUrl: log.photoStorageId
        ? await ctx.storage.getUrl(log.photoStorageId)
        : null,
    };
  },
});

export const dailyTotals = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
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
    ingredients: v.optional(v.array(ingredientValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("foodLogs", { ...args, userId });
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
    const userId = await requireUserId(ctx);
    await ownedLog(ctx, id, userId);
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("foodLogs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    await ownedLog(ctx, id, userId);
    await ctx.db.delete(id);
  },
});
