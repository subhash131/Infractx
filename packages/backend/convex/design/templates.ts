import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { buildFrameTemplateTree } from "./utils";

export const saveFrameTemplate = mutation({
  args: {
    frameId: v.id("layers"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const frame = await ctx.db.get(args.frameId);
    if (!frame) return [];
    const user = await ctx.auth.getUserIdentity();
    if (!user)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });

    const layers = await ctx.db
      .query("layers")
      .withIndex("by_page", (q) => q.eq("pageId", frame.pageId))
      .collect();
    const template = buildFrameTemplateTree(layers, args.frameId);
    await ctx.db.insert("templates", {
      createdAt: Date.now(),
      createdBy: user?.issuer,
      frameDate: JSON.stringify(template),
      isPublic: false,
      name: args.name,
      org_id: "org_123",
      description: args.description,
    });
  },
});

export const getTemplatesByOrganization = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_organization", (q) => q.eq("org_id", "org_123"))
      .collect();

    return templates;
  },
});
export const getTemplatesByUser = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user.issuer))
      .collect();

    return templates;
  },
});
export const getTemplateById = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_id", (q) => q.eq("_id", args.templateId))
      .unique();

    return templates;
  },
});
