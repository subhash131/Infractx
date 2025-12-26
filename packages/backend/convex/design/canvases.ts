import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const createCanvas = mutation({
  args: {
    name: v.string(),
    width: v.number(),
    height: v.number(),
    backgroundColor: v.optional(v.string()),
    pageId: v.id("pages"),
    order: v.number(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });

    const canvasId = await ctx.db.insert("canvases", {
      pageId: args.pageId,
      name: args.name,
      width: args.width,
      height: args.height,
      backgroundColor: args.backgroundColor,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      order: args.order,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return canvasId;
  },
});

export const getCanvasById = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db.get(args.canvasId);
  },
});

export const getFileCanvases = query({
  args: { pageId: v.id("pages") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });

    return await ctx.db
      .query("canvases")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
  },
});
