import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a canvas object
export const createObject = mutation({
  args: {
    canvasId: v.id("canvases"),
    type: v.string(),
    objectId: v.string(),
    left: v.number(),
    top: v.number(),
    width: v.number(),
    height: v.number(),
    angle: v.optional(v.number()),
    scaleX: v.optional(v.number()),
    scaleY: v.optional(v.number()),
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    opacity: v.optional(v.number()),
    text: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    textAlign: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    radius: v.optional(v.number()),
    rx: v.optional(v.number()),
    ry: v.optional(v.number()),
    shadow: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user has edit access
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", args.canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator || collaborator.role === "viewer") {
      throw new Error("Not authorized");
    }

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
    objectId: v.id("canvasObjects"),
    left: v.optional(v.number()),
    top: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    angle: v.optional(v.number()),
    scaleX: v.optional(v.number()),
    scaleY: v.optional(v.number()),
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    opacity: v.optional(v.number()),
    text: v.optional(v.string()),
    zIndex: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    data: v.optional(v.any()),
  },
  async handler(ctx, args) {
    const { objectId, ...updates } = args;
    const object = await ctx.db.get(objectId);
    if (!object) throw new Error("Object not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify edit access
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", object.canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator || collaborator.role === "viewer") {
      throw new Error("Not authorized");
    }

    const previousState = { ...object };

    await ctx.db.patch(objectId, {
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

    return objectId;
  },
});

// Delete canvas object
export const deleteObject = mutation({
  args: { objectId: v.id("canvasObjects") },
  async handler(ctx, args) {
    const object = await ctx.db.get(args.objectId);
    if (!object) throw new Error("Object not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify edit access
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", object.canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator || collaborator.role === "viewer") {
      throw new Error("Not authorized");
    }

    // Log to history
    await ctx.db.insert("canvasHistory", {
      canvasId: object.canvasId,
      action: "delete",
      objectId: object.objectId,
      previousState: object,
      timestamp: Date.now(),
      userId: identity.subject,
    });

    await ctx.db.delete(args.objectId);
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

      const collaborator = await ctx.db
        .query("collaborators")
        .withIndex("by_canvas_user", (q) =>
          q.eq("canvasId", object.canvasId).eq("userId", identity.subject)
        )
        .first();

      if (!collaborator || collaborator.role === "viewer") {
        throw new Error("Not authorized");
      }

      await ctx.db.patch(update.id, {
        ...update.changes,
        updatedAt: Date.now(),
      });
    }
  },
});
