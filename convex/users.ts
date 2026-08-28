import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";

// Every user-data function goes through this. It throws rather than returning
// null so a missing auth check can never silently read or write another
// account's rows.
export async function requireUserId(
  ctx: QueryCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not signed in");
  }
  return userId;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { _id: user._id, email: user.email ?? null };
  },
});
