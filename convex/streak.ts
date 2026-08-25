import { query } from "./_generated/server";

// Derived from actual logged dates, never a stored counter — this is what
// review complaints about broken/reset streaks were caused by upstream:
// a mutable counter that could desync from the real log history.
export const current = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("foodLogs").withIndex("by_date").collect();
    const loggedDates = new Set(logs.map((log) => log.date));

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (loggedDates.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  },
});

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
