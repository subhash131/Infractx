import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/** Debounce delay (ms) before embedding is triggered after the last edit */
const EMBED_DEBOUNCE_MS = 10000;


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
    const blockId = await ctx.db.insert("blocks", {
      ...args,
      embeddedContent: null,
      pendingEmbedJobId: null,
    });

    // Schedule embedding with debounce
    const jobId = await ctx.scheduler.runAfter(
      EMBED_DEBOUNCE_MS,
      internal.requirements.embeddings.embedBlock,
      { blockId }
    );
    await ctx.db.patch(blockId, { pendingEmbedJobId: jobId });

    return blockId;
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
      const blockId = await ctx.db.insert("blocks", {
        ...block,
        textFileId,
        embeddedContent: null,
        pendingEmbedJobId: null,
      });

      // Schedule embedding with debounce
      const jobId = await ctx.scheduler.runAfter(
        EMBED_DEBOUNCE_MS,
        internal.requirements.embeddings.embedBlock,
        { blockId }
      );
      await ctx.db.patch(blockId, { pendingEmbedJobId: jobId });
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

      let blockId;

      if (existing) {
        const { externalId, ...updates } = block;

        // Cancel any previously scheduled embed job for this block
        if (existing.pendingEmbedJobId) {
          await ctx.scheduler.cancel(existing.pendingEmbedJobId);
        }

        await ctx.db.patch(existing._id, { ...updates });
        blockId = existing._id;
      } else {
        // Insert new block with all required fields
        blockId = await ctx.db.insert("blocks", {
          textFileId,
          externalId: block.externalId,
          type: block.type ?? "paragraph",
          content: block.content ?? [],
          props: block.props ?? {},
          rank: block.rank ?? "a0",
          parentId: block.parentId ?? null,
          approvedByHuman: block.approvedByHuman ?? true,
          embeddedContent: null,
          pendingEmbedJobId: null,
        });
        console.log(`Inserted new block with UUID ${block.externalId}`);
      }

      // Schedule (or reschedule) the embedding job with debounce
      const jobId = await ctx.scheduler.runAfter(
        EMBED_DEBOUNCE_MS,
        internal.requirements.embeddings.embedBlock,
        { blockId }
      );
      await ctx.db.patch(blockId, { pendingEmbedJobId: jobId });
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