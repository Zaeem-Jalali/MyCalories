import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireUserId } from "./users";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // An upload URL is a write into this deployment's storage, so it is never
    // handed out to an unauthenticated caller.
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Deletes an uploaded blob that never got attached to a log: the user picked
// a photo, then replaced or removed it, or left the screen. Without this every
// abandoned pick is a billable file that nothing references.
export const discardUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await requireUserId(ctx);

    // Guard against deleting a photo the user actually kept: if any of their
    // own food logs already reference this blob, leave it alone.
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (logs.some((log) => log.photoStorageId === storageId)) return;

    await ctx.storage.delete(storageId);
  },
});
