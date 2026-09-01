"use node";

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type IdentifiedIngredient = {
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type IdentifiedLabel = {
  name: string;
  // Total declared package size, read from "Net Wt"/"Net Vol" on the
  // package if visible, otherwise null — never guessed.
  packageAmount: number | null;
  // "ml" for a printed "Net Vol"/liquid measure, "g" for a printed weight.
  unit: "g" | "ml";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type IdentifiedPlanEntry = {
  dayOfWeek: number;
  activity: "walk" | "run" | "cycle" | "weights";
  durationMinutes: number;
  intensity: "slow" | "normal" | "brisk";
  notes: string | null;
};

const WORKOUT_SCHEDULE_PROMPT = `You are reading a photo of a handwritten or printed weekly workout schedule. Extract every planned
session you can actually read. For each one report the day of the week as a number (0 = Sunday,
1 = Monday, through 6 = Saturday), the activity mapped to the closest of "walk", "run", "cycle" or
"weights" (treat gym, lifting, resistance and strength training as "weights"; treat jogging as "run";
treat spinning and biking as "cycle"; treat hiking and treadmill walking as "walk"), the planned
duration in minutes, and the intensity as "slow", "normal" or "brisk".

Rules: only report sessions that are actually written in the photo, never invent a session to fill an
empty day. If a duration is not written, use 30. If an intensity is not written, use "normal". If a
session is an activity that does not map to any of the four options above, skip it. Put anything else
written about the session (exercise names, sets, reps, distance) in "notes", or null if there is none.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"dayOfWeek": number, "activity": "walk" | "run" | "cycle" | "weights", "durationMinutes": number, "intensity": "slow" | "normal" | "brisk", "notes": string | null}]`;

const FOOD_PHOTO_PROMPT = `You are a nutrition estimation assistant. Look at this food photo and identify each distinct
ingredient or food item visible. For each one, estimate its portion size in grams based on what's
actually visible in the photo (plate size, depth, typical density) — never assume a default serving,
always reason about the real quantity shown. Then estimate calories, protein, carbs, and fat for that
specific portion (not per 100g).

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name": string, "estimatedGrams": number, "calories": number, "proteinG": number, "carbsG": number, "fatG": number}]`;

const NUTRITION_LABEL_PROMPT = `You are reading a packaged food or drink's nutrition facts label, for a product that isn't in any
barcode database. Read the printed values exactly as shown — do not estimate or round beyond what's
printed. Report calories, protein, carbs, and fat per 100 units, where the unit is "ml" if this is a
drink/liquid (juice, soda, milk, etc.) and "g" if it's a solid food — convert from per-serving if
that's what's printed, using the printed serving size. Separately, look for the package's declared net
weight or volume (e.g. "Net Wt 40g", "Net Vol 500ml", "200ml") printed anywhere on the packaging in
this photo — if you can find it, report the number and whether it's grams or milliliters; if it isn't
visible in this photo, return null for packageAmount, don't guess.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"name": string, "packageAmount": number | null, "unit": "g" | "ml", "caloriesPer100g": number, "proteinPer100g": number, "carbsPer100g": number, "fatPer100g": number}`;

// Vision provider is isolated behind this one function so swapping to a paid
// Gemini tier or to Claude later is a config change, not a rewrite.
async function callVisionModel<T>(
  prompt: string,
  base64Image: string,
  mimeType: string,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run `npx convex env set GEMINI_API_KEY <key>`.",
    );
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",
      // Header, not a query param: a fetch-level failure can embed the request
      // URL in its message, and that message reaches the logs.
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          },
        ],
        // "low" is the extraction/classification tier. Food identification and
        // label reading are structured extraction, not open reasoning, so the
        // default (medium) budget mostly adds latency. This is the single
        // biggest lever on how long the user waits after taking a photo.
        generationConfig: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // Thinking-enabled models can emit multiple parts (reasoning trace +
  // final answer); skip thought parts and concatenate the rest.
  const text = parts
    .filter((part: { thought?: boolean; text?: string }) => !part.thought)
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Gemini returned no content");
  }

  return JSON.parse(text) as T;
}

async function readStorageAsBase64(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
): Promise<{ base64Image: string; mimeType: string }> {
  // These actions read arbitrary stored files and spend Gemini quota, so they
  // are closed to unauthenticated callers like every other data function.
  if ((await getAuthUserId(ctx)) === null) {
    throw new Error("Not signed in");
  }
  const blob = await ctx.storage.get(storageId);
  if (!blob) {
    throw new Error("Photo not found in storage");
  }
  const arrayBuffer = await blob.arrayBuffer();
  return {
    base64Image: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: blob.type || "image/jpeg",
  };
}

export const identifyFood = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<IdentifiedIngredient[]> => {
    const { base64Image, mimeType } = await readStorageAsBase64(ctx, storageId);
    return await callVisionModel<IdentifiedIngredient[]>(
      FOOD_PHOTO_PROMPT,
      base64Image,
      mimeType,
    );
  },
});

const ACTIVITIES = ["walk", "run", "cycle", "weights"] as const;
const INTENSITIES = ["slow", "normal", "brisk"] as const;

function normalizeNotes(notes: unknown): string | null {
  if (typeof notes === "string") return notes.trim() || null;
  if (Array.isArray(notes)) {
    const joined = notes.filter((part) => typeof part === "string").join(", ");
    return joined || null;
  }
  if (typeof notes === "number") return String(notes);
  return null;
}

export const identifyWorkoutSchedule = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<IdentifiedPlanEntry[]> => {
    const { base64Image, mimeType } = await readStorageAsBase64(ctx, storageId);
    const parsed = await callVisionModel<IdentifiedPlanEntry[]>(
      WORKOUT_SCHEDULE_PROMPT,
      base64Image,
      mimeType,
    );
    if (!Array.isArray(parsed)) {
      throw new Error("Couldn't read a weekly schedule from that photo");
    }
    // The model is free-form enough that a bad day number or an unmapped
    // activity would fail the mutation's validator further downstream. Drop
    // those rows here instead of guessing what was meant. `notes` is the one
    // free-text field, so it gets normalised rather than dropped: a model that
    // returns a sets/reps array there shouldn't cost the whole schedule.
    return parsed
      .filter(
        (entry) =>
          Number.isInteger(entry?.dayOfWeek) &&
          entry.dayOfWeek >= 0 &&
          entry.dayOfWeek <= 6 &&
          ACTIVITIES.includes(entry.activity) &&
          INTENSITIES.includes(entry.intensity) &&
          typeof entry.durationMinutes === "number" &&
          entry.durationMinutes > 0,
      )
      .map((entry) => ({ ...entry, notes: normalizeNotes(entry.notes) }));
  },
});

// Fallback for products missing from Open Food Facts (common for smaller /
// regional brands) — reads the printed label directly instead of relying on
// database coverage, which fixes both the "not found" gap and the "how many
// grams is this package" problem in one photo.
export const identifyLabel = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<IdentifiedLabel> => {
    const { base64Image, mimeType } = await readStorageAsBase64(ctx, storageId);
    return await callVisionModel<IdentifiedLabel>(
      NUTRITION_LABEL_PROMPT,
      base64Image,
      mimeType,
    );
  },
});
