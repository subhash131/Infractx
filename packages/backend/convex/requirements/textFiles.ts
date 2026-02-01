import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    documentId:v.id("documents"),
    type:v.union(v.literal("FILE"),v.literal("FOLDER")),
    parentId: v.optional(v.id("text_files")),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("text_files", {
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),    
      type: args.type,
      documentId: args.documentId,
      parentId: args.parentId,
    });

    return docId;
  },
});

export const getFilesByDocumentId = query({
  args: {
    documentId:v.id("documents"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db.query("text_files").withIndex("by_document", q=>q.eq("documentId", args.documentId)).collect();
    return files;
  },
});

export const getTextFileById = query({
  args: {
    fileId:v.id("text_files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    return file;
  },
});

export const updateFile = mutation({
  args: {
    fileId: v.id("text_files"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.union(v.id("text_files"), v.null())),
  },
  handler: async (ctx, args) => {
    const { fileId, ...updates } = args;
    
    // Build the update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: Date.now(),
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.parentId !== undefined) updateData.parentId = updates.parentId;
    
    await ctx.db.patch(fileId, updateData);
  },
});
