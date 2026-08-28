"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export type IdentifiedIngredient = {
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const PROMPT = `You are a nutrition estimation assistant. Look at this food photo and identify each distinct
ingredient or food item visible. For each one, estimate its portion size in grams based on what's
actually visible in the photo (plate size, depth, typical density) — never assume a default serving,
always reason about the real quantity shown. Then estimate calories, protein, carbs, and fat for that
specific portion (not per 100g).

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name": string, "estimatedGrams": number, "calories": number, "proteinG": number, "carbsG": number, "fatG": number}]`;

// Vision provider is isolated behind this one function so swapping to a paid
// Gemini tier or to Claude later is a config change, not a rewrite.
async function callVisionModel(
  base64Image: string,
  mimeType: string,
): Promise<IdentifiedIngredient[]> {
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
              { text: PROMPT },
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

  return JSON.parse(text) as IdentifiedIngredient[];
}

export const identifyFood = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<IdentifiedIngredient[]> => {
    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      throw new Error("Photo not found in storage");
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    return await callVisionModel(base64Image, blob.type || "image/jpeg");
  },
});
