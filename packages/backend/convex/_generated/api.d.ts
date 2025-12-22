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
import type * as authUtils from "../authUtils.js";
import type * as canvases from "../canvases.js";
import type * as collaborators from "../collaborators.js";
import type * as comments from "../comments.js";
import type * as history from "../history.js";
import type * as layers from "../layers.js";
import type * as objects from "../objects.js";
import type * as templates from "../templates.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authUtils: typeof authUtils;
  canvases: typeof canvases;
  collaborators: typeof collaborators;
  comments: typeof comments;
  history: typeof history;
  layers: typeof layers;
  objects: typeof objects;
  templates: typeof templates;
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
