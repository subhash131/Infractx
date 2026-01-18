import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Create a page
export const createPage = mutation({
  args: {
    designId: v.id("designs"),
    name: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });

    const file = await ctx.db
      .query("designs")
      .withIndex("by_id", (q) => q.eq("_id", args.designId));

    if (!file)
      new ConvexError({
        code: "NOT_FOUND",
        message: "File not found",
      });

    const pageId = await ctx.db.insert("pages", {
      name: args.name,
      bgColor: "#D9D9D9",
      layersCount: 0,
      designId: args.designId,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.designId, {
      activePage: pageId,
    });

    return pageId;
  },
});

// Get pages in a file
export const getFilePages = query({
  args: { designId: v.id("designs") },
  async handler(ctx, args) {
    return await ctx.db
      .query("pages")
      .withIndex("by_design", (q) => q.eq("designId", args.designId))
      .collect();
  },
});

export const getPageById = query({
  args: { pageId: v.id("pages") },
  async handler(ctx, args) {
    return await ctx.db
      .query("pages")
      .withIndex("by_id", (q) => q.eq("_id", args.pageId))
      .order("asc")
      .unique();
  },
});

// Update page
export const updatePage = mutation({
  args: {
    name: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    pageId: v.id("pages"),
  },
  async handler(ctx, args) {
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const updates: Partial<typeof page> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bgColor !== undefined) updates.bgColor = args.bgColor;

    await ctx.db.patch(args.pageId, updates);
    return args.pageId;
  },
});

// Delete pages
export const deletePages = mutation({
  args: { pageId: v.id("pages"), designId: v.id("designs") },
  async handler(ctx, args) {
    const file = await ctx.db.get(args.designId);
    if (!file) throw new Error("File not found");
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_design", (q) => q.eq("designId", args.designId))
      .collect();
    if (pages.length <= 1)
      throw new Error("Cannot delete the only available page");

    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.pageId);
    return true;
  },
});
