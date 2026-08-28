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
