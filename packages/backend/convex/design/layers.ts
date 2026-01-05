import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { DESIGN_TOOLS_TYPE } from "./constants";
import { Doc, Id } from "../_generated/dataModel";
import { getNextFramePosition } from "./utils";
import { api } from "../_generated/api";

// Create a canvas object
export const createObject = mutation({
  args: {
    pageId: v.id("pages"),
    // Object properties
    type: DESIGN_TOOLS_TYPE,
    name: v.optional(v.string()),

    // Position and dimensions
    padding: v.optional(v.number()),
    left: v.optional(v.float64()),
    top: v.float64(),
    width: v.float64(),
    height: v.float64(),
    points: v.optional(
      v.array(
        v.object({
          x: v.number(),
          y: v.number(),
        })
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
    parentLayerId: v.optional(v.id("layers")),
    borderScaleFactor: v.optional(v.float64()),
    frameTop: v.optional(v.float64()),
  },
  async handler(ctx, args): Promise<Id<"layers">> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get max zIndex
    const maxZIndex = await ctx.db
      .query("layers")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect()
      .then((objs) =>
        Math.max(...objs.map((o) => (o?.zIndex ? o.zIndex : -1)), -1)
      );

    let frameLeft: number = args.left || 0;
    if (args.type === "FRAME") {
      console.log("before ::", frameLeft);
      const existingFrames = await ctx.runQuery(
        api.design.layers.getLayersByType,
        { pageId: args.pageId as Id<"pages">, type: "FRAME" }
      );
      frameLeft = getNextFramePosition(existingFrames).left;
      console.log("after ::", frameLeft);
    }

    const layerId = await ctx.db.insert("layers", {
      pageId: args.pageId,
      type: args.type,
      top: args.type === "FRAME" ? args.frameTop || args.top : args.top,
      left: frameLeft,
      width: args.width,
      height: args.height,
      angle: args.angle ?? 0,
      scaleX: args.scaleX ?? 1,
      scaleY: args.scaleY ?? 1,
      fill: args.fill,
      stroke: args.stroke,
      strokeWidth: args.strokeWidth ?? 0,
      opacity: args.opacity ?? 1,
      text: args.text,
      fontSize: args.fontSize,
      fontFamily: args.fontFamily,
      fontWeight: args.fontWeight,
      textAlign: args.textAlign,
      imageUrl: args.imageUrl,
      radius: args.radius,
      rx: args.rx,
      ry: args.ry,
      shadow: args.shadow,
      data: args.data,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      borderColor: "#4096ee",
      borderScaleFactor: args.borderScaleFactor,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      strokeUniform: args.strokeUniform,
      points: args.points,
      fontStyle: args.fontStyle,
      linethrough: args.linethrough,
      overline: args.overline,
      underline: args.underline,
      padding: args.padding,
      name: args.name || "Undefined",
      parentLayerId: args.parentLayerId,
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
