import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
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

export const getFilesByParentId = query({
  args: {
    parentId: v.union(v.id("text_files"), v.null()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("text_files")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const getAncestors = query({
  args: {
    fileId: v.id("text_files"),
  },
  handler: async (ctx, args) => {
    const ancestors = [];
    let currentFile = await ctx.db.get(args.fileId);

    while (currentFile && currentFile.parentId) {
      const parent = await ctx.db.get(currentFile.parentId);
      if (parent) {
        ancestors.unshift(parent);
        currentFile = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("text_files"),
  },
  handler: async (ctx, args) => {
    // Recursively delete children if it's a folder
    const children = await ctx.db
      .query("text_files")
      .withIndex("by_parent", (q) => q.eq("parentId", args.fileId))
      .collect();

    for (const child of children) {
      // Recursively delete each child
      await ctx.runMutation(api.requirements.textFiles.deleteFile, {
        fileId: child._id,
      });
    }

    // Delete all blocks associated with this file
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_text_file", (q) => q.eq("textFileId", args.fileId))
      .collect();

    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    await ctx.db.delete(args.fileId);
  },
});

export const duplicateFile = mutation({
  args: {
    fileId: v.id("text_files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    const newId = await ctx.db.insert("text_files", {
      title: `${file.title}_copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: file.type,
      documentId: file.documentId,
      parentId: file.parentId,
    });

    // Duplicate all blocks associated with this file
    await duplicateBlocks(ctx, args.fileId, newId);

    // If it's a folder, recursively duplicate children
    if (file.type === "FOLDER") {
      const children = await ctx.db
        .query("text_files")
        .withIndex("by_parent", (q) => q.eq("parentId", args.fileId))
        .collect();

      for (const child of children) {
        await duplicateFileRecursive(ctx, child._id, newId);
      }
    }

    return newId;
  },
});

async function duplicateFileRecursive(
  ctx: any,
  fileId: any,
  newParentId: any
) {
  const file = await ctx.db.get(fileId);
  if (!file) return;

  const newId = await ctx.db.insert("text_files", {
    title: file.title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: file.type,
    documentId: file.documentId,
    parentId: newParentId,
  });

  // Duplicate all blocks associated with this file
  await duplicateBlocks(ctx, fileId, newId);

  if (file.type === "FOLDER") {
    const children = await ctx.db
      .query("text_files")
      .withIndex("by_parent", (q: any) => q.eq("parentId", fileId))
      .collect();

    for (const child of children) {
      await duplicateFileRecursive(ctx, child._id, newId);
    }
  }
}

async function duplicateBlocks(
  ctx: any,
  sourceFileId: any,
  newFileId: any
) {
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_text_file", (q: any) => q.eq("textFileId", sourceFileId))
    .collect();

  // Build mapping: oldExternalId → newExternalId
  const idMap: Record<string, string> = {};
  for (const block of blocks) {
    idMap[block.externalId] = crypto.randomUUID();
  }

  // Insert blocks with remapped parentId and externalId
  for (const block of blocks) {
    await ctx.db.insert("blocks", {
      textFileId: newFileId,
      parentId: block.parentId && idMap[block.parentId]
        ? idMap[block.parentId]
        : block.parentId,
      type: block.type,
      props: block.props,
      content: block.content,
      rank: block.rank,
      externalId: idMap[block.externalId],
    });
  }
}
