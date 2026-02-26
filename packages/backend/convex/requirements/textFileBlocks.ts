import { mutation, query } from "../_generated/server";
import { v } from "convex/values";


export const createBlock = mutation({
  args: {
    externalId: v.string(), // UUID from client
    textFileId: v.id("text_files"),
    type: v.string(),
    props: v.any(),
    content: v.any(),
    rank: v.string(),
    parentId: v.optional(v.union(v.string(), v.null())),
    approvedByHuman: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blocks", {...args, embeddedContent:null});
  },
});

export const updateBlock = mutation({
  args: {
    id: v.id("blocks"), // Convex ID
    externalId: v.optional(v.string()),
    type: v.optional(v.string()),
    props: v.optional(v.any()),
    content: v.optional(v.any()),
    rank: v.optional(v.string()),
    parentId: v.optional(v.union(v.string(), v.null())),
    approvedByHuman: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const bulkCreate = mutation({
  args: {
    textFileId: v.id("text_files"),
    blocks: v.array(
      v.object({
        externalId: v.string(),
        type: v.string(),
        props: v.any(),
        content: v.any(),
        rank: v.string(),
        parentId: v.optional(v.union(v.string(), v.null())),
        approvedByHuman: v.boolean(),
      })
    ),
  },
  handler: async (ctx, { textFileId, blocks }) => {
    for (const block of blocks) {
      await ctx.db.insert("blocks", { ...block, textFileId, embeddedContent:null});
    }
  },
});


export const bulkUpdate = mutation({
  args: {
    textFileId: v.id("text_files"),
    blocks: v.array(
      v.object({
        externalId: v.string(),
        content: v.optional(v.any()),
        props: v.optional(v.any()),
        rank: v.optional(v.string()),
        type: v.optional(v.string()),
        parentId: v.optional(v.union(v.string(), v.null())), 
        approvedByHuman: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { textFileId, blocks }) => {
    for (const block of blocks) {
      // Search specifically using the indexed externalId
      const existing = await ctx.db
        .query("blocks")
        .withIndex("by_external_id", (q) => q.eq("externalId", block.externalId))
        .unique();
      
      console.log(`Searching for UUID: ${block.externalId} -> Found: ${existing?._id ?? "NULL"}`);

      if (existing) {
        const { externalId, ...updates } = block;
        
        // Ensure parentId is handled as a string if that's what your schema/editor uses
        await ctx.db.patch(existing._id, {
          ...updates,
          // Only cast if your schema explicitly uses v.id("blocks")
          // If schema uses v.string(), remove the "as Id" cast
          // parentId: updates.parentId 
        });
      } else {
        // Insert new block with all required fields
        await ctx.db.insert("blocks", {
          textFileId,
          externalId: block.externalId,
          type: block.type ?? "paragraph", // Default type if not provided
          content: block.content ?? [],
          props: block.props ?? {},
          rank: block.rank ?? "a0",
          parentId: block.parentId ?? null,
          approvedByHuman:block.approvedByHuman ?? true,
          embeddedContent:null
        });
        console.log(`Inserted new block with UUID ${block.externalId}`);
      }
    }
  },
});

export const bulkDelete = mutation({
  args: {
    externalIds: v.array(v.string()), 
  },
  handler: async (ctx, { externalIds }) => {
    for (const extId of externalIds) {
      const existing = await ctx.db
        .query("blocks")
        .withIndex("by_external_id", (q) => q.eq("externalId", extId))
        .unique();
      if (existing) {
        console.log(`Deleting block with UUID ${extId}`);
        await ctx.db.delete(existing._id);
      }else{
        console.log(`Block with UUID ${extId} not found`);
      }
    }
  },
});

export const getBlocksByFileId = query({
  args: {
    textFileId: v.id("text_files"),
  },
  handler: async (ctx, { textFileId }) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_text_file", (q) => q.eq("textFileId", textFileId))
      .collect();
  },
});


export const getBlockByExternalId = query({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, { externalId }) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
      .unique();
  },
});

export const getSmartBlocks = query({
  args: {
    textFileId: v.id("text_files"),
  },
  handler: async (ctx, { textFileId }) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_textfileId_blockType", (q) => q.eq("textFileId", textFileId).eq("type", "smartBlock"))
      .collect();
    
    return blocks
  },
});