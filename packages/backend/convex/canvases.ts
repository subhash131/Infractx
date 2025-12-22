import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new canvas
export const createCanvas = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    backgroundColor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const canvasId = await ctx.db.insert("canvases", {
      name: args.name,
      description: args.description,
      ownerId: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      width: args.width,
      height: args.height,
      backgroundColor: args.backgroundColor,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });

    // Add owner as collaborator
    await ctx.db.insert("collaborators", {
      canvasId,
      userId: identity.subject,
      role: "owner",
      addedAt: Date.now(),
    });

    return canvasId;
  },
});

// Get canvas by ID
export const getCanvas = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db.get(args.canvasId);
  },
});

// Get all canvases for current user
export const getUserCanvases = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("canvases")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();
  },
});

// Update canvas properties
export const updateCanvas = mutation({
  args: {
    canvasId: v.id("canvases"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    backgroundColor: v.optional(v.string()),
    zoom: v.optional(v.number()),
    offsetX: v.optional(v.number()),
    offsetY: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const { canvasId, ...updates } = args;
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // Verify ownership or editor access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator || collaborator.role === "viewer") {
      throw new Error("Not authorized to edit this canvas");
    }

    await ctx.db.patch(canvasId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return canvasId;
  },
});

// Delete canvas
export const deleteCanvas = mutation({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || canvas.ownerId !== identity.subject) {
      throw new Error("Not authorized to delete this canvas");
    }

    // Delete all canvas objects
    const objects = await ctx.db
      .query("canvasObjects")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const obj of objects) {
      await ctx.db.delete(obj._id);
    }

    // Delete all layers
    const layers = await ctx.db
      .query("layers")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const layer of layers) {
      await ctx.db.delete(layer._id);
    }

    // Delete history
    const history = await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const item of history) {
      await ctx.db.delete(item._id);
    }

    // Delete collaborators
    const collaborators = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const collab of collaborators) {
      await ctx.db.delete(collab._id);
    }

    // Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete the canvas
    await ctx.db.delete(args.canvasId);
  },
});
