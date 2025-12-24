import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a design template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    canvasData: v.any(),
    thumbnail: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.boolean(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      createdBy: identity.subject,
      canvasData: args.canvasData,
      thumbnail: args.thumbnail,
      tags: args.tags,
      isPublic: args.isPublic,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// Get template by ID
export const getTemplate = query({
  args: { templateId: v.id("templates") },
  async handler(ctx, args) {
    return await ctx.db.get(args.templateId);
  },
});

// Get all public templates
export const getPublicTemplates = query({
  args: {
    limit: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  async handler(ctx, args) {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("templates")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(limit);

    return await query;
  },
});

// Get user's templates
export const getUserTemplates = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("templates")
      .withIndex("by_created_by", (q) => q.eq("createdBy", identity.subject))
      .order("desc")
      .collect();
  },
});

// Update template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    canvasData: v.optional(v.any()),
    thumbnail: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const { templateId, ...updates } = args;
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error("Template not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || template.createdBy !== identity.subject) {
      throw new Error("Only the creator can edit this template");
    }

    await ctx.db.patch(templateId, updates);
    return templateId;
  },
});

// Delete template
export const deleteTemplate = mutation({
  args: { templateId: v.id("templates") },
  async handler(ctx, args) {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || template.createdBy !== identity.subject) {
      throw new Error("Only the creator can delete this template");
    }

    await ctx.db.delete(args.templateId);
  },
});

// Create canvas from template
export const createCanvasFromTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    canvasName: v.string(),
  },
  async handler(ctx, args) {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create new canvas with template data
    const canvasData = template.canvasData;

    const canvasId = await ctx.db.insert("canvases", {
      name: args.canvasName,
      description: `Created from template: ${template.name}`,
      ownerId: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      width: canvasData.width || 1200,
      height: canvasData.height || 800,
      backgroundColor: canvasData.backgroundColor,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });

    // Create objects from template
    if (canvasData.objects && Array.isArray(canvasData.objects)) {
      for (const obj of canvasData.objects) {
        await ctx.db.insert("canvasObjects", {
          canvasId,
          ...obj,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return canvasId;
  },
});
