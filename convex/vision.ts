"use node";

import { v } from "convex/values";
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
  // Total declared package size in grams, read from "Net Wt"/"Net Vol" on
  // the package if visible, otherwise null — never guessed.
  packageGrams: number | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

const FOOD_PHOTO_PROMPT = `You are a nutrition estimation assistant. Look at this food photo and identify each distinct
ingredient or food item visible. For each one, estimate its portion size in grams based on what's
actually visible in the photo (plate size, depth, typical density) — never assume a default serving,
always reason about the real quantity shown. Then estimate calories, protein, carbs, and fat for that
specific portion (not per 100g).

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name": string, "estimatedGrams": number, "calories": number, "proteinG": number, "carbsG": number, "fatG": number}]`;

const NUTRITION_LABEL_PROMPT = `You are reading a packaged food's nutrition facts label, for a product that isn't in any
barcode database. Read the printed values exactly as shown — do not estimate or round beyond what's
printed. Report calories, protein, carbs, and fat per 100g (convert from per-serving if that's what's
printed, using the printed serving size in grams). Separately, look for the package's declared net
weight or volume (e.g. "Net Wt 40g", "200ml") printed anywhere on the packaging in this photo — if you
can find it, report it in grams (treat ml as grams for liquids); if it isn't visible in this photo,
return null for packageGrams, don't guess.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"name": string, "packageGrams": number | null, "caloriesPer100g": number, "proteinPer100g": number, "carbsPer100g": number, "fatPer100g": number}`;

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } },
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
