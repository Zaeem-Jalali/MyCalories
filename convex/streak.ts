import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./users";

// Derived from actual logged dates, never a stored counter — this is what
// review complaints about broken/reset streaks were caused by upstream:
// a mutable counter that could desync from the real log history.
export const current = query({
  // The client passes its own today, because the server runs on UTC and would
  // otherwise break the streak a few hours early or late for most timezones.
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const userId = await requireUserId(ctx);
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const loggedDates = new Set(logs.map((log) => log.date));

    const [year, month, day] = today.split("-").map(Number);
    const cursor = new Date(year, month - 1, day);

    let streak = 0;
    while (loggedDates.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  },
});

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
