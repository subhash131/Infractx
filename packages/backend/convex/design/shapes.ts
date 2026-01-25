import { ConvexError, v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { deleteShapeRecursive, shapeInsertValidator } from "./utils";

export const createShape = mutation({
  args: {
    shapeObject: shapeInsertValidator,
  },
  async handler(ctx, args): Promise<{ _id: Id<"shapes">; success: boolean }> {
    const { shapeObject } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const shapeId = await ctx.db.insert("shapes", {
      ...shapeObject,
    });
    return { _id: shapeId, success: true };
  },
});

export const getShapeById = query({
  args: {
    shapeId: v.id("shapes"),
  },
  async handler(ctx, args): Promise<Doc<"shapes">> {
    const { shapeId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const shape = await ctx.db
      .query("shapes")
      .withIndex("by_id", (q) => q.eq("_id", shapeId))
      .unique();
    if (!shape) {
      throw new ConvexError("Shape not found");
    }
    return shape;
  },
});
export const getShapesByPage = query({
  args: {
    pageId: v.id("pages"),
  },
  async handler(ctx, args): Promise<Doc<"shapes">[]> {
    const { pageId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const shapes = await ctx.db
      .query("shapes")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();
    return shapes;
  },
});

export const updateShape = mutation({
  args: {
    shapeId: v.id("shapes"),
    shapeObject: shapeInsertValidator.partial(),
  },
  async handler(ctx, args): Promise<{ _id: Id<"shapes">; success: boolean }> {
    const { shapeId, shapeObject } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const shape = await ctx.db
      .query("shapes")
      .withIndex("by_id", (q) => q.eq("_id", shapeId))
      .unique();

    if (!shape) {
      throw new ConvexError("Shape not found");
    }
    await ctx.db.patch(shapeId, shapeObject);
    return { _id: shape._id, success: true };
  },
});

export const deleteShapeRecursively = mutation({
  args: {
    shapeIds: v.array(v.id("shapes")),
  },
  async handler(ctx, args) {
    const { shapeIds } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 2. Use Promise.all to handle the array of IDs selected by the user
    // This allows us to delete multiple separate trees in parallel
    await Promise.all(
      shapeIds.map(async (shapeId) => {
        // Optional: Check if the top-level shape exists before starting recursion
        // (deleteRecursive will just do nothing if the ID doesn't exist at the delete step,
        // but explicit checking is fine too)
        const shape = await ctx.db.get(shapeId);
        if (shape) {
          await deleteShapeRecursive(ctx, shapeId);
        }
      }),
    );

    return { success: true };
  },
});
export const deleteShapeById = mutation({
  args: {
    shapeId: v.id("shapes"),
  },
  async handler(ctx, args) {
    const { shapeId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete("shapes", shapeId);

    return { success: true };
  },
});
