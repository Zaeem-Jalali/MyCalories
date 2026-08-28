import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  QueryCtx,
  action,
  internalAction,
  internalQuery,
  query,
} from "./_generated/server";
import { requireUserId } from "./users";

export type MonthlySummary = {
  year: number;
  month: number; // 1-12
  weight: {
    firstLbs: number | null;
    lastLbs: number | null;
    changeLbs: number | null;
    series: { date: string; weightLbs: number }[];
  };
  adherence: {
    daysElapsed: number;
    daysLogged: number;
    daysMissed: number;
  };
  foods: {
    name: string;
    timesLogged: number;
    averageCalories: number;
    totalCalories: number;
  }[];
  goalDirection: "cut" | "maintain" | "bulk" | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const summary = query({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
    // The client's own today, so "days elapsed" for the current month is the
    // user's calendar day rather than the server's UTC one.
    today: v.string(),
  },
  handler: async (ctx, { year, month, today }): Promise<MonthlySummary> => {
    const userId = await requireUserId(ctx);
    return await computeSummary(ctx, userId, year, month, today);
  },
});

// Same computation against an explicit account, for CLI checks and anything
// server-side that has no session of its own.
export const summaryForUser = internalQuery({
  args: {
    userId: v.id("users"),
    year: v.number(),
    month: v.number(),
    today: v.string(),
  },
  handler: async (ctx, { userId, year, month, today }) =>
    await computeSummary(ctx, userId, year, month, today),
});

async function computeSummary(
  ctx: QueryCtx,
  userId: Id<"users">,
  year: number,
  month: number,
  today: string,
): Promise<MonthlySummary> {
    const prefix = `${year}-${pad(month)}`;
    const start = `${prefix}-01`;
    const end = `${prefix}-${pad(daysInMonth(year, month))}`;

    const [foodLogs, weightLogs, profile] = await Promise.all([
      ctx.db
        .query("foodLogs")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", start).lte("date", end),
        )
        .collect(),
      ctx.db
        .query("weightLogs")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", start).lte("date", end),
        )
        .collect(),
      ctx.db
        .query("profile")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
    ]);

    const series = weightLogs
      .map((log) => ({ date: log.date, weightLbs: log.weightLbs }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // One weigh-in is not a change. Reporting 0 there would state a fact the
    // data doesn't support.
    const hasChange = series.length >= 2;
    const firstLbs = hasChange ? series[0].weightLbs : null;
    const lastLbs = hasChange ? series[series.length - 1].weightLbs : null;

    // A month in progress is judged against the days that have actually
    // happened, so "days missed" never counts the future.
    const total = daysInMonth(year, month);
    const daysElapsed = today.startsWith(prefix)
      ? Math.min(total, Number(today.slice(8, 10)))
      : today < start
        ? 0
        : total;

    const loggedDates = new Set(foodLogs.map((log) => log.date));
    const daysLogged = loggedDates.size;

    const byName = new Map<
      string,
      { name: string; timesLogged: number; totalCalories: number }
    >();
    for (const log of foodLogs) {
      const key = log.name.trim().toLowerCase();
      if (!key) continue;
      const entry = byName.get(key);
      if (entry) {
        entry.timesLogged += 1;
        entry.totalCalories += log.calories;
      } else {
        byName.set(key, {
          name: log.name.trim(),
          timesLogged: 1,
          totalCalories: log.calories,
        });
      }
    }

    const foods = [...byName.values()]
      .map((entry) => ({
        name: entry.name,
        timesLogged: entry.timesLogged,
        totalCalories: Math.round(entry.totalCalories),
        averageCalories: Math.round(entry.totalCalories / entry.timesLogged),
      }))
      .sort((a, b) => b.timesLogged - a.timesLogged || b.totalCalories - a.totalCalories);

    return {
      year,
      month,
      weight: {
        firstLbs,
        lastLbs,
        changeLbs:
          firstLbs !== null && lastLbs !== null
            ? Math.round((lastLbs - firstLbs) * 10) / 10
            : null,
        series,
      },
      adherence: {
        daysElapsed,
        daysLogged,
        daysMissed: Math.max(0, daysElapsed - daysLogged),
      },
      foods,
      goalDirection: profile?.goalDirection ?? null,
    };
}

export type MonthlyInsights = {
  keepGoing: string[];
  considerLimiting: string[];
  summary: string;
};

const INSIGHTS_PROMPT = `You are writing a short monthly food review for someone tracking their calories. You are given
their real aggregated numbers for the month. Use only those numbers. Never invent a calorie total, a
weight, a date or a food that is not in the data, and never state a number that contradicts it.

Write in plain, direct language. No hype, no exclamation marks, no motivational filler, no emoji, and
no em dashes. Short sentences. Address the person as "you".

Return two lists of foods drawn only from the recurring foods given, and one short paragraph of at
most three sentences summarising the month against their goal direction. "keepGoing" is foods worth
continuing. "considerLimiting" is foods worth cutting back on given the goal. A food belongs in at
most one list, and either list may be empty if the data does not support it.

The paragraph must contain no digits at all. You are given the month in words, not numbers, precisely
so that you cannot restate a figure incorrectly. The exact calories, weights and day counts are shown
to the person alongside your text, so describe the shape of the month, not its numbers.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"keepGoing": string[], "considerLimiting": string[], "summary": string}`;

export const generateInsights = action({
  args: { year: v.number(), month: v.number(), today: v.string() },
  handler: async (ctx, args): Promise<MonthlyInsights> => {
    const data: MonthlySummary = await ctx.runQuery(
      api.monthlyReport.summary,
      args,
    );
    return await writeInsights(data);
  },
});

// Same review against an explicit account, so the Gemini call can be exercised
// from the CLI where there is no session.
export const generateInsightsForUser = internalAction({
  args: {
    userId: v.id("users"),
    year: v.number(),
    month: v.number(),
    today: v.string(),
  },
  handler: async (ctx, args): Promise<MonthlyInsights> => {
    const data: MonthlySummary = await ctx.runQuery(
      internal.monthlyReport.summaryForUser,
      args,
    );
    return await writeInsights(data);
  },
});

async function writeInsights(data: MonthlySummary): Promise<MonthlyInsights> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Run `npx convex env set GEMINI_API_KEY <key>`.",
      );
    }

    // The model is given the shape of the month in words, never the figures,
    // so it has no number available to restate incorrectly. Every number the
    // user sees is rendered from the query above.
    const { daysLogged, daysElapsed } = data.adherence;
    const loggedShare = daysElapsed > 0 ? daysLogged / daysElapsed : 0;
    const payload = {
      goalDirection: data.goalDirection,
      weightTrend:
        data.weight.changeLbs === null
          ? "not enough weigh-ins to tell"
          : data.weight.changeLbs < -0.5
            ? "down"
            : data.weight.changeLbs > 0.5
              ? "up"
              : "about the same",
      loggingConsistency:
        loggedShare >= 0.8
          ? "logged nearly every day"
          : loggedShare >= 0.5
            ? "logged more days than not"
            : loggedShare > 0
              ? "logged only a few days"
              : "did not log at all",
      recurringFoods: data.foods
        .slice(0, 20)
        .map((food) => ({ name: food.name, timesLogged: food.timesLogged })),
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: INSIGHTS_PROMPT },
                { text: JSON.stringify(payload) },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const body = await response.json();
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((part: { thought?: boolean; text?: string }) => !part.thought)
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!text) {
      throw new Error("Gemini returned no content");
    }

    const parsed = JSON.parse(text) as MonthlyInsights;
    const known = new Set(data.foods.map((food) => food.name.toLowerCase()));
    // The model is only allowed to sort foods it was given. Anything invented
    // is dropped rather than shown as if it came from the log.
    const onlyKnown = (list: unknown): string[] =>
      Array.isArray(list)
        ? list.filter(
            (item): item is string =>
              typeof item === "string" && known.has(item.trim().toLowerCase()),
          )
        : [];

    // A food belongs to one list, and no list repeats itself, whatever the
    // model returned.
    const keepGoing = [...new Set(onlyKnown(parsed.keepGoing))];
    const keepSet = new Set(keepGoing.map((item) => item.toLowerCase()));
    const considerLimiting = [
      ...new Set(onlyKnown(parsed.considerLimiting)),
    ].filter((item) => !keepSet.has(item.toLowerCase()));

    // Belt and braces on the no-digits instruction: if a figure slipped in, it
    // could contradict the cards next to it, so the review is refused rather
    // than shown.
    const summaryText = typeof parsed.summary === "string" ? parsed.summary : "";
    if (/\d/.test(summaryText)) {
      throw new Error("The review came back with numbers in it. Try again.");
    }
    if (!summaryText && keepGoing.length === 0 && considerLimiting.length === 0) {
      throw new Error("The review came back empty. Try again.");
    }

    return { keepGoing, considerLimiting, summary: summaryText };
}
