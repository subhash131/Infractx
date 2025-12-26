import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Create a new file
export const createFile = mutation({
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

    // TODO: Verify organizationId access when implemented
    const fileId = await ctx.db.insert("files", {
      name: args.name,
      description: args.description,
      ownerId: identity.subject,
      organizationId: args.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const pageId = await ctx.db.insert("pages", {
      bgColor: "#D9D9D9",
      fileId,
      name: "Page 1",
      layersCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(fileId, {
      activePage: pageId,
    });

    return fileId;
  },
});

export const setActivePage = mutation({
  args: {
    fileId: v.id("files"),
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
      .query("files")
      .withIndex("by_id", (q) => q.eq("_id", args.fileId))
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

    await ctx.db.patch(args.fileId, {
      activePage: page._id,
    });
    return true;
  },
});

// Get file by ID
export const getFile = query({
  args: { fileId: v.id("files") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const file = await ctx.db.get(args.fileId);
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

// Get all files for current user
export const getUserFiles = query({
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
      .query("files")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject as any))
      .collect();

    // Filter by organization if provided
    if (args.organizationId) {
      return files.filter((f) => f.organizationId === args.organizationId);
    }

    return files;
  },
});

// Update file
export const updateFile = mutation({
  args: {
    fileId: v.id("files"),
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

    const file = await ctx.db.get(args.fileId);
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

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.organizationId !== undefined)
      updates.organizationId = args.organizationId;

    await ctx.db.patch(args.fileId, updates);

    return args.fileId;
  },
});
