import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Export canvas to JSON
export const exportCanvasAsJson = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const objects = await ctx.db
      .query("canvasObjects")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    const layers = await ctx.db
      .query("layers")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    return {
      canvas,
      objects,
      layers,
      exportedAt: Date.now(),
    };
  },
});

// Import canvas from JSON
export const importCanvasFromJson = mutation({
  args: {
    name: v.string(),
    canvasData: v.any(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { canvas: importedCanvas, objects, layers } = args.canvasData;

    // Create canvas
    const canvasId = await ctx.db.insert("canvases", {
      name: args.name,
      description: importedCanvas.description,
      ownerId: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      width: importedCanvas.width,
      height: importedCanvas.height,
      backgroundColor: importedCanvas.backgroundColor,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });

    // Create objects
    const objectIdMap = new Map();
    if (objects && Array.isArray(objects)) {
      for (const obj of objects) {
        const newObjId = await ctx.db.insert("canvasObjects", {
          ...obj,
          canvasId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        objectIdMap.set(obj._id, newObjId);
      }
    }

    // Create layers
    if (layers && Array.isArray(layers)) {
      for (const layer of layers) {
        const newLayerId = await ctx.db.insert("layers", {
          ...layer,
          canvasId,
        });

        // Map layer objects
        // This would require the layer objects mapping to be included in the import
      }
    }

    return canvasId;
  },
});

// Search canvases by name
export const searchCanvases = query({
  args: {
    query: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get user's accessible canvases
    const ownedCanvases = await ctx.db
      .query("canvases")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    const allCanvases = [...ownedCanvases];
    const searchTerm = args.query.toLowerCase();

    return allCanvases.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.description && c.description.toLowerCase().includes(searchTerm))
    );
  },
});

// Get canvas statistics
export const getCanvasStats = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) throw new Error("Canvas not found");

    const objects = await ctx.db
      .query("canvasObjects")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    const layers = await ctx.db
      .query("layers")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    const history = await ctx.db
      .query("canvasHistory")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    const objectsByType: Record<string, number> = {};
    for (const obj of objects) {
      objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1;
    }

    return {
      totalObjects: objects.length,
      objectsByType,
      totalLayers: layers.length,
      totalChanges: history.length,
      createdAt: canvas.createdAt,
      lastModified: canvas.updatedAt,
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
    };
  },
});

// Batch delete canvases
export const deleteMultipleCanvases = mutation({
  args: {
    canvasIds: v.array(v.id("canvases")),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (const canvasId of args.canvasIds) {
      const canvas = await ctx.db.get(canvasId);
      if (!canvas) continue;

      if (canvas.ownerId !== identity.subject) {
        throw new Error("Not authorized to delete this canvas");
      }

      // Delete all related data
      const objects = await ctx.db
        .query("canvasObjects")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
        .collect();

      for (const obj of objects) {
        await ctx.db.delete(obj._id);
      }

      const history = await ctx.db
        .query("canvasHistory")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
        .collect();

      for (const item of history) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(canvasId);
    }
  },
});
