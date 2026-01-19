import { ConvexError, v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { shapeInsertValidator } from "./utils";

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
export const getShapeByPage = query({
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

export const deleteShape = mutation({
  args: {
    shapeId: v.id("shapes"),
  },
  async handler(ctx, args): Promise<{ _id: Id<"shapes">; success: boolean }> {
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
    const children = await ctx.db
      .query("shapes")
      .withIndex("by_parent", (q) => q.eq("parentShapeId", shapeId))
      .collect();
    for (const child of children) {
      await ctx.db.delete(child._id);
    }
    await ctx.db.delete(shapeId);
    return { _id: shape._id, success: true };
  },
});
