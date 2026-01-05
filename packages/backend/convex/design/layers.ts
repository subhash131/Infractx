import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  DESIGN_TOOLS_TYPE,
  LAYER_OBJECT_ARGS,
  SELECT_COLOR,
} from "./constants";
import { Doc, Id } from "../_generated/dataModel";
import { getNextFramePosition } from "./utils";
import { api } from "../_generated/api";

// Create a canvas object
export const createObject = mutation({
  args: {
    layerObject: LAYER_OBJECT_ARGS,
  },
  async handler(ctx, args): Promise<Id<"layers">> {
    const { layerObject } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get max zIndex
    const maxZIndex = await ctx.db
      .query("layers")
      .withIndex("by_page", (q) => q.eq("pageId", layerObject.pageId))
      .collect()
      .then((objs) =>
        Math.max(...objs.map((o) => (o?.zIndex ? o.zIndex : -1)), -1)
      );

    let frameLeft: number = layerObject.left || 0;
    if (layerObject.type === "FRAME") {
      console.log("before ::", frameLeft);
      const existingFrames = await ctx.runQuery(
        api.design.layers.getLayersByType,
        { pageId: layerObject.pageId as Id<"pages">, type: "FRAME" }
      );
      frameLeft = getNextFramePosition(existingFrames).left;
      console.log("after ::", frameLeft);
    }

    const layerId = await ctx.db.insert("layers", {
      pageId: layerObject.pageId,
      type: layerObject.type,
      top:
        layerObject.type === "FRAME"
          ? layerObject.frameTop || layerObject.top
          : layerObject.top,
      left: frameLeft,
      width: layerObject.width,
      height: layerObject.height,
      angle: layerObject.angle ?? 0,
      scaleX: layerObject.scaleX ?? 1,
      scaleY: layerObject.scaleY ?? 1,
      fill: layerObject.fill,
      stroke: layerObject.stroke,
      strokeWidth: layerObject.strokeWidth ?? 0,
      opacity: layerObject.opacity ?? 1,
      text: layerObject.text,
      fontSize: layerObject.fontSize,
      fontFamily: layerObject.fontFamily,
      fontWeight: layerObject.fontWeight,
      textAlign: layerObject.textAlign,
      imageUrl: layerObject.imageUrl,
      radius: layerObject.radius,
      rx: layerObject.rx,
      ry: layerObject.ry,
      shadow: layerObject.shadow,
      data: layerObject.data,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      borderScaleFactor: layerObject.borderScaleFactor,
      borderColor: SELECT_COLOR,
      cornerColor: SELECT_COLOR,
      cornerSize: 8,
      cornerStrokeColor: SELECT_COLOR,
      strokeUniform: layerObject.strokeUniform,
      points: layerObject.points,
      fontStyle: layerObject.fontStyle,
      linethrough: layerObject.linethrough,
      overline: layerObject.overline,
      underline: layerObject.underline,
      padding: layerObject.padding,
      name: layerObject.name || "Undefined",
      parentLayerId: layerObject.parentLayerId,
    });

    return layerId;
  },
});
export const updateObject = mutation({
  args: {
    _id: v.id("layers"),
    parentLayerId: v.optional(v.id("layers")),
    name: v.optional(v.string()),

    // Position and dimensions
    padding: v.optional(v.number()),
    left: v.optional(v.float64()),
    top: v.optional(v.float64()),
    width: v.optional(v.float64()),
    height: v.optional(v.float64()),
    points: v.optional(
      v.optional(
        v.array(
          v.object({
            x: v.number(),
            y: v.number(),
          })
        )
      )
    ),

    // Rotation and scaling
    angle: v.optional(v.float64()),
    scaleX: v.optional(v.float64()),
    scaleY: v.optional(v.float64()),

    // Styling
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.optional(v.float64()),
    opacity: v.optional(v.float64()),
    // Text-specific properties
    text: v.optional(v.string()),
    fontSize: v.optional(v.float64()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    textAlign: v.optional(v.string()),
    fontStyle: v.optional(v.string()),
    underline: v.optional(v.boolean()),
    linethrough: v.optional(v.boolean()),
    overline: v.optional(v.boolean()),

    // Image-specific properties
    imageUrl: v.optional(v.string()),

    // Shape-specific properties
    radius: v.optional(v.float64()),
    rx: v.optional(v.float64()),
    ry: v.optional(v.float64()),

    // Advanced properties
    shadow: v.optional(v.string()),
    data: v.optional(v.any()), // Store arbitrary fabric.js object data
    strokeUniform: v.optional(v.boolean()),
    borderScaleFactor: v.optional(v.float64()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const layerId = await ctx.db.patch(args._id, {
      ...args,
      parentLayerId: args.parentLayerId ? args.parentLayerId : undefined,
    });

    return layerId;
  },
});

export const getLayersByPage = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const layers = await ctx.db
      .query("layers")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();

    // Build a tree structure
    const buildTree = (
      parentId: string | null | undefined
    ): Doc<"layers">[] => {
      return layers
        .filter((layer) => {
          // Handle both null and undefined as root layers
          if (parentId === null || parentId === undefined) {
            return !layer.parentLayerId; // Matches null, undefined, or missing
          }
          return layer.parentLayerId === parentId;
        })
        .map((layer) => ({
          ...layer,
          children: buildTree(layer._id),
        }));
    };

    return buildTree(null);
  },
});

export const deleteObject = mutation({
  args: { id: v.id("layers") },
  async handler(ctx, args) {
    const object = await ctx.db.get(args.id);
    if (!object) throw new Error("Object not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.id);
  },
});
export const getLayersByType = query({
  args: {
    pageId: v.id("pages"),
    type: DESIGN_TOOLS_TYPE,
  },
  handler: async (ctx, args) => {
    const layers = await ctx.db
      .query("layers")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();

    return layers;
  },
});

export const getLayerById = query({
  args: { frameId: v.id("layers") },
  handler: async (ctx, args) => {
    const frame = await ctx.db
      .query("layers")
      .withIndex("by_id", (q) => q.eq("_id", args.frameId))
      .unique();
    return frame;
  },
});
