/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as exerciseLogs from "../exerciseLogs.js";
import type * as files from "../files.js";
import type * as foodLogs from "../foodLogs.js";
import type * as profile from "../profile.js";
import type * as progressPhotos from "../progressPhotos.js";
import type * as savedMeals from "../savedMeals.js";
import type * as streak from "../streak.js";
import type * as vision from "../vision.js";
import type * as weightLogs from "../weightLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  exerciseLogs: typeof exerciseLogs;
  files: typeof files;
  foodLogs: typeof foodLogs;
  profile: typeof profile;
  progressPhotos: typeof progressPhotos;
  savedMeals: typeof savedMeals;
  streak: typeof streak;
  vision: typeof vision;
  weightLogs: typeof weightLogs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
