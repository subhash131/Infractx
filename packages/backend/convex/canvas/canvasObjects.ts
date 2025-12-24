import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Create a canvas object
export const createObject = mutation({
  args: {
    canvasId: v.id("canvases"),
    // Object properties
    type: v.string(), // "rect", "circle", "triangle", "text", "image", "path", etc.
    objectId: v.string(), // Unique ID within the canvas

    // Position and dimensions
    left: v.float64(),
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
    angle: v.float64(),
    scaleX: v.float64(),
    scaleY: v.float64(),

    // Styling
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.float64(),
    opacity: v.float64(),

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
    cornerColor: v.optional(v.string()),
    cornerSize: v.optional(v.float64()),
    cornerStrokeColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderScaleFactor: v.optional(v.float64()),

    // Metadata
    zIndex: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get max zIndex
    const maxZIndex = await ctx.db
      .query("canvasObjects")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect()
      .then((objs) => Math.max(...objs.map((o) => o.zIndex), -1));

    const objectId = await ctx.db.insert("canvasObjects", {
      canvasId: args.canvasId,
      type: args.type,
      objectId: args.objectId,
      left: args.left,
      top: args.top,
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
      borderColor: args.borderColor,
      borderScaleFactor: args.borderScaleFactor,
      cornerColor: args.cornerColor,
      cornerSize: args.cornerSize,
      cornerStrokeColor: args.cornerStrokeColor,
      strokeUniform: args.strokeUniform,
      points: args.points,
      fontStyle: args.fontStyle,
      linethrough: args.linethrough,
      overline: args.overline,
      underline: args.underline,
    });

    // Log to history
    await ctx.db.insert("canvasHistory", {
      canvasId: args.canvasId,
      action: "create",
      objectId: args.objectId,
      newState: { type: args.type, id: objectId },
      timestamp: Date.now(),
      userId: identity.subject,
    });

    return objectId;
  },
});

// Get objects in a canvas
export const getCanvasObjects = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db
      .query("canvasObjects")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();
  },
});

// Update canvas object
export const updateObject = mutation({
  args: {
    // Object properties
    _id: v.id("canvasObjects"),
    type: v.string(), // "rect", "circle", "triangle", "text", "image", "path", etc.
    objectId: v.string(), // Unique ID within the canvas

    // Position and dimensions
    left: v.float64(),
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
    angle: v.float64(),
    scaleX: v.float64(),
    scaleY: v.float64(),

    // Styling
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.float64(),
    opacity: v.float64(),

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
    cornerColor: v.optional(v.string()),
    cornerSize: v.optional(v.float64()),
    cornerStrokeColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderScaleFactor: v.optional(v.float64()),

    // Metadata
    zIndex: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const { objectId, ...updates } = args;
    const object = await ctx.db
      .query("canvasObjects")
      .withIndex("by_id", (q) => q.eq("_id", args._id))
      .unique();
    if (!object) throw new Error("Object not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const previousState = { ...object };

    await ctx.db.patch(args._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Log to history
    await ctx.db.insert("canvasHistory", {
      canvasId: object.canvasId,
      action: "update",
      objectId: object.objectId,
      previousState,
      newState: updates,
      timestamp: Date.now(),
      userId: identity.subject,
    });

    return args._id;
  },
});

// Delete canvas object
export const deleteObject = mutation({
  args: { id: v.id("canvasObjects") },
  async handler(ctx, args) {
    const object = await ctx.db.get(args.id);
    if (!object) throw new Error("Object not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Log to history
    await ctx.db.insert("canvasHistory", {
      canvasId: object.canvasId,
      action: "delete",
      objectId: object.objectId,
      previousState: object,
      timestamp: Date.now(),
      userId: identity.subject,
    });
    await ctx.db.delete(args.id);
  },
});

// Batch update objects (for performance)
export const updateObjects = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("canvasObjects"),
        changes: v.any(),
      })
    ),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (const update of args.updates) {
      const object = await ctx.db.get(update.id);
      if (!object) continue;

      await ctx.db.patch(update.id, {
        ...update.changes,
        updatedAt: Date.now(),
      });
    }
  },
});
