import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add collaborator to canvas
export const addCollaborator = mutation({
  args: {
    canvasId: v.id("canvases"),
    userId: v.string(),
    role: v.string(), // "editor" or "viewer"
  },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || canvas.ownerId !== identity.subject) {
      throw new Error("Only the owner can add collaborators");
    }

    // Check if already a collaborator
    const existing = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", args.canvasId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      // Update role if needed
      await ctx.db.patch(existing._id, { role: args.role });
      return existing._id;
    }

    const collaboratorId = await ctx.db.insert("collaborators", {
      canvasId: args.canvasId,
      userId: args.userId,
      role: args.role,
      addedAt: Date.now(),
    });

    return collaboratorId;
  },
});

// Remove collaborator
export const removeCollaborator = mutation({
  args: {
    canvasId: v.id("canvases"),
    userId: v.string(),
  },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || canvas.ownerId !== identity.subject) {
      throw new Error("Only the owner can remove collaborators");
    }

    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", args.canvasId).eq("userId", args.userId)
      )
      .first();

    if (collaborator) {
      await ctx.db.delete(collaborator._id);
    }
  },
});

// Get collaborators for canvas
export const getCanvasCollaborators = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db
      .query("collaborators")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();
  },
});

// Update collaborator role
export const updateCollaboratorRole = mutation({
  args: {
    canvasId: v.id("canvases"),
    userId: v.string(),
    role: v.string(),
  },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || canvas.ownerId !== identity.subject) {
      throw new Error("Only the owner can update roles");
    }

    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", args.canvasId).eq("userId", args.userId)
      )
      .first();

    if (collaborator) {
      await ctx.db.patch(collaborator._id, { role: args.role });
    }
  },
});

// Get canvases shared with user
export const getSharedCanvases = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const collaborations = await ctx.db
      .query("collaborators")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const canvases = [];
    for (const collab of collaborations) {
      const canvas = await ctx.db.get(collab.canvasId);
      if (canvas && canvas.ownerId !== identity.subject) {
        canvases.push({ ...canvas, role: collab.role });
      }
    }

    return canvases;
  },
});

// Get all canvases accessible to user (owned + shared)
export const getAccessibleCanvases = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get owned canvases
    const owned = await ctx.db
      .query("canvases")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    // Get shared canvases
    const collaborations = await ctx.db
      .query("collaborators")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const shared = [];
    for (const collab of collaborations) {
      const canvas = await ctx.db.get(collab.canvasId);
      if (canvas && canvas.ownerId !== identity.subject) {
        shared.push(canvas);
      }
    }

    return [...owned, ...shared];
  },
});
