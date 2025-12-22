import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get canvas history
export const getCanvasHistory = query({
  args: {
    canvasId: v.id("canvases"),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas_timestamp", (q) => q.eq("canvasId", args.canvasId))
      .order("desc")
      .take(limit);
  },
});

// Get history for specific object
export const getObjectHistory = query({
  args: {
    canvasId: v.id("canvases"),
    objectId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas_timestamp", (q) => q.eq("canvasId", args.canvasId))
      .filter((q) => q.eq(q.field("objectId"), args.objectId))
      .order("desc")
      .collect();
  },
});

// Undo - revert to previous state
export const undoChange = mutation({
  args: {
    canvasId: v.id("canvases"),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get last change by current user
    const lastChange = await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas_timestamp", (q) => q.eq("canvasId", args.canvasId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .first();

    if (!lastChange) return null;

    // Revert the change
    if (lastChange.action === "create" && lastChange.newState?.id) {
      // Delete the created object
      const dbObj = await ctx.db.get(lastChange.newState.id);
      if (dbObj) {
        await ctx.db.delete(lastChange.newState.id);
      }
    } else if (lastChange.action === "delete" && lastChange.previousState) {
      // Restore the deleted object
      const restoredId = await ctx.db.insert("canvasObjects", {
        ...lastChange.previousState,
        updatedAt: Date.now(),
      });
      return restoredId;
    } else if (lastChange.action === "update" && lastChange.previousState) {
      // Revert to previous state
      if (lastChange.newState?.id) {
        await ctx.db.patch(lastChange.newState.id, lastChange.previousState);
      }
    }

    // Delete the history entry
    await ctx.db.delete(lastChange._id);
  },
});

// Redo - reapply a change
export const redoChange = mutation({
  args: {
    historyId: v.id("canvasHistory"),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const historyEntry = await ctx.db.get(args.historyId);
    if (!historyEntry) throw new Error("History entry not found");

    // Verify user can edit
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", historyEntry.canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator || collaborator.role === "viewer") {
      throw new Error("Not authorized");
    }

    if (historyEntry.action === "create" && historyEntry.newState) {
      // Recreate the object
      return await ctx.db.insert("canvasObjects", historyEntry.newState);
    } else if (historyEntry.action === "update" && historyEntry.newState) {
      // Reapply the update
      if (historyEntry.previousState?.id) {
        await ctx.db.patch(
          historyEntry.previousState.id,
          historyEntry.newState
        );
      }
    }
  },
});

// Clear history for canvas (keep it clean)
export const clearCanvasHistory = mutation({
  args: {
    canvasId: v.id("canvases"),
  },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || canvas.ownerId !== identity.subject) {
      throw new Error("Only the owner can clear history");
    }

    const history = await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    for (const item of history) {
      await ctx.db.delete(item._id);
    }
  },
});
