import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const photos = await ctx.db
      .query("progressPhotos")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();

    return await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      })),
    );
  },
});

export const create = mutation({
  args: { date: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { date, storageId }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("progressPhotos", { userId, date, storageId });
  },
});

export const remove = mutation({
  args: { id: v.id("progressPhotos") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const photo = await ctx.db.get(id);
    if (!photo || photo.userId !== userId) {
      throw new Error("Photo not found");
    }
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(id);
  },
});
