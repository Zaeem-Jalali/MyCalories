/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as exerciseLogs from "../exerciseLogs.js";
import type * as exercisePlans from "../exercisePlans.js";
import type * as files from "../files.js";
import type * as foodLogs from "../foodLogs.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as monthlyReport from "../monthlyReport.js";
import type * as profile from "../profile.js";
import type * as progressPhotos from "../progressPhotos.js";
import type * as savedMeals from "../savedMeals.js";
import type * as streak from "../streak.js";
import type * as users from "../users.js";
import type * as vision from "../vision.js";
import type * as weightLogs from "../weightLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  exerciseLogs: typeof exerciseLogs;
  exercisePlans: typeof exercisePlans;
  files: typeof files;
  foodLogs: typeof foodLogs;
  http: typeof http;
  migrations: typeof migrations;
  monthlyReport: typeof monthlyReport;
  profile: typeof profile;
  progressPhotos: typeof progressPhotos;
  savedMeals: typeof savedMeals;
  streak: typeof streak;
  users: typeof users;
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
