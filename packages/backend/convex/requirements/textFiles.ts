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

export const moveFile = mutation({
  args: {
    fileId: v.id("text_files"),
    newParentId: v.optional(v.id("text_files")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      parentId: args.newParentId,
      updatedAt: Date.now(),
    });
  },
});
