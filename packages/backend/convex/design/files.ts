import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export const createDesignFile = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const designId = await ctx.db.insert("designs", {
      name: args.name,
      description: args.description,
      ownerId: identity.subject,
      organizationId: args.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const pageId = await ctx.db.insert("pages", {
      bgColor: "#D9D9D9",
      designId,
      name: "Page 1",
      layersCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(designId, {
      activePage: pageId,
    });

    return designId;
  },
});

export const setActivePage = mutation({
  args: {
    designId: v.id("designs"),
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const file = await ctx.db
      .query("designs")
      .withIndex("by_id", (q) => q.eq("_id", args.designId))
      .unique();
    if (!file) {
      throw new ConvexError({
        code: "NOT_FOUND",
        messages: "File not found",
      });
    }
    const page = await ctx.db
      .query("pages")
      .withIndex("by_id", (q) => q.eq("_id", args.pageId))
      .unique();
    if (!page) {
      throw new ConvexError({
        code: "NOT_FOUND",
        messages: "Page not found",
      });
    }

    await ctx.db.patch(args.designId, {
      activePage: page._id,
    });
    return true;
  },
});

export const getDesignFileById = query({
  args: { designId: v.id("designs") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const file = await ctx.db.get(args.designId);
    if (!file) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    // Check ownership or organization access
    const isOwner = file.ownerId === identity.subject;
    // TODO: Add organization member check when implemented
    const hasOrgAccess = false;

    if (!isOwner && !hasOrgAccess) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized to access this file",
      });
    }

    return file;
  },
});

export const getDesignFilesByOrgId = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const files = await ctx.db
      .query("designs")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    // Filter by organization if provided
    if (args.organizationId) {
      return files.filter((f) => f.organizationId === args.organizationId);
    }

    return files;
  },
});

export const updateDesignFile = mutation({
  args: {
    designId: v.id("designs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const file = await ctx.db.get(args.designId);
    if (!file) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    if (file.ownerId !== identity.subject) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized to update this file",
      });
    }

    const updates: Partial<Doc<"designs">> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.organizationId !== undefined)
      updates.organizationId = args.organizationId;

    await ctx.db.patch(args.designId, updates);

    return args.designId;
  },
});
