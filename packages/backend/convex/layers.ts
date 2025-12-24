import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a layer
export const createLayer = mutation({
  args: {
    canvasId: v.id("canvases"),
    name: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get max zIndex
    const maxZIndex = await ctx.db
      .query("layers")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect()
      .then((layers) => Math.max(...layers.map((l) => l.zIndex), -1));

    const layerId = await ctx.db.insert("layers", {
      canvasId: args.canvasId,
      name: args.name,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: maxZIndex + 1,
      createdAt: Date.now(),
    });

    return layerId;
  },
});

// Get layers in a canvas
export const getCanvasLayers = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db
      .query("layers")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .order("asc")
      .collect();
  },
});

// Update layer
export const updateLayer = mutation({
  args: {
    layerId: v.id("layers"),
    name: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    opacity: v.optional(v.number()),
    zIndex: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const { layerId, ...updates } = args;
    const layer = await ctx.db.get(layerId);
    if (!layer) throw new Error("Layer not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(layerId, updates);
    return layerId;
  },
});

// Delete layer
export const deleteLayer = mutation({
  args: { layerId: v.id("layers") },
  async handler(ctx, args) {
    const layer = await ctx.db.get(args.layerId);
    if (!layer) throw new Error("Layer not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Delete all layer objects
    const layerObjects = await ctx.db
      .query("layerObjects")
      .withIndex("by_layer", (q) => q.eq("layerId", args.layerId))
      .collect();

    for (const layerObj of layerObjects) {
      await ctx.db.delete(layerObj._id);
    }

    await ctx.db.delete(args.layerId);
  },
});

// Add object to layer
export const addObjectToLayer = mutation({
  args: {
    layerId: v.id("layers"),
    objectId: v.id("canvasObjects"),
  },
  async handler(ctx, args) {
    const layer = await ctx.db.get(args.layerId);
    if (!layer) throw new Error("Layer not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Remove from other layers first
    const existing = await ctx.db
      .query("layerObjects")
      .withIndex("by_object", (q) => q.eq("objectId", args.objectId))
      .collect();

    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    // Add to new layer
    const layerObjectId = await ctx.db.insert("layerObjects", {
      layerId: args.layerId,
      objectId: args.objectId,
    });

    return layerObjectId;
  },
});

// Remove object from layer
export const removeObjectFromLayer = mutation({
  args: {
    layerId: v.id("layers"),
    objectId: v.string(),
  },
  async handler(ctx, args) {
    const layer = await ctx.db.get(args.layerId);
    if (!layer) throw new Error("Layer not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const layerObject = await ctx.db
      .query("layerObjects")
      .withIndex("by_layer", (q) => q.eq("layerId", args.layerId))
      .filter((q) => q.eq(q.field("objectId"), args.objectId))
      .first();

    if (layerObject) {
      await ctx.db.delete(layerObject._id);
    }
  },
});

// Get objects in a layer
export const getLayerObjects = query({
  args: { layerId: v.id("layers") },
  async handler(ctx, args) {
    const layerObjects = await ctx.db
      .query("layerObjects")
      .withIndex("by_layer", (q) => q.eq("layerId", args.layerId))
      .collect();

    const objects = [];
    for (const layerObj of layerObjects) {
      const object = await ctx.db.get(layerObj.objectId);
      if (object) objects.push(object);
    }

    return objects;
  },
});
