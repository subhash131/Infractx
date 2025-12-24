/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_auth from "../auth/auth.js";
import type * as canvas_canvasObjects from "../canvas/canvasObjects.js";
import type * as canvas_canvases from "../canvas/canvases.js";
import type * as canvas_history from "../canvas/history.js";
import type * as canvas_layers from "../canvas/layers.js";
import type * as canvas_templates from "../canvas/templates.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/auth": typeof auth_auth;
  "canvas/canvasObjects": typeof canvas_canvasObjects;
  "canvas/canvases": typeof canvas_canvases;
  "canvas/history": typeof canvas_history;
  "canvas/layers": typeof canvas_layers;
  "canvas/templates": typeof canvas_templates;
  utils: typeof utils;
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
