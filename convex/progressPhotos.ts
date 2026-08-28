import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db
      .query("progressPhotos")
      .withIndex("by_date")
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
    return await ctx.db.insert("progressPhotos", { date, storageId });
  },
});

export const remove = mutation({
  args: { id: v.id("progressPhotos") },
  handler: async (ctx, { id }) => {
    const photo = await ctx.db.get(id);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(id);
    }
  },
});
