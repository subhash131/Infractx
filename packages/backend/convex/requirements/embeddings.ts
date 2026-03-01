import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/** Debounce delay matches the one in textFileBlocks.ts */
const EMBED_DEBOUNCE_MS = 3000;

/**
 * Internal action: embeds a single block's content.
 * Called by the scheduler ~3s after the last edit to that block.
 *
 * Each block (paragraph, heading, list item…) is already a natural chunk,
 * so we send its plain text directly to POST /embed on the embeddings server
 * and store the single returned vector on the block.
 */
export const embedBlock = internalAction({
  args: {
    blockId: v.id("blocks"),
  },
  handler: async (ctx, { blockId }) => {
    const block = await ctx.runQuery(internal.requirements.embeddings.getBlock, { blockId });

    if (!block) {
      console.warn(`[embedBlock] Block ${blockId} not found, skipping.`);
      return;
    }

    const embeddingModelUrl = process.env.EMBEDDING_384_MODEL_URL;

    if (!embeddingModelUrl) {
      console.error("[embedBlock] EMBEDDING_384_MODEL_URL is not set.");
      return;
    }

    // ── Extract plain text from block content ──────────────────────────────
    const text = extractTextFromContent(block.content);

    if (!text || text.trim().length === 0) {
      console.log(`[embedBlock] Block ${blockId} has no text, skipping embed.`);
      await ctx.runMutation(internal.requirements.embeddings.saveEmbedding, {
        blockId,
        embedding: null,
      });
      return;
    }

    // ── Call the embeddings server ─────────────────────────────────────────
    const response = await fetch(`${embeddingModelUrl}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[embedBlock] Embedding server error (${response.status}): ${errText}`);
      return;
    }

    const { embeddings } = (await response.json()) as { embeddings: number[][] };
    const embedding: number[] | null = embeddings?.[0] ?? null;

    // ── Persist embedding back to the block ───────────────────────────────
    await ctx.runMutation(internal.requirements.embeddings.saveEmbedding, {
      blockId,
      embedding,
    });

    console.log(`[embedBlock] Embedded block ${blockId}`);
  },
});

/**
 * Internal query: fetch a block by ID (used inside the action above).
 */
export const getBlock = internalQuery({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }) => {
    return await ctx.db.get(blockId);
  },
});

/**
 * Internal mutation: saves the computed embedding and clears the pending job ID.
 */
export const saveEmbedding = internalMutation({
  args: {
    blockId: v.id("blocks"),
    embedding: v.union(v.array(v.float64()), v.null()),
  },
  handler: async (ctx, { blockId, embedding }) => {
    await ctx.db.patch(blockId, {
      embeddedContent: embedding,
      pendingEmbedJobId: null, // clear the job reference once done
    });
  },
});

// ── Search ────────────────────────────────────────────────────────────────
/**
 * Public action: embed a search query and return matching blocks ranked by
 * vector similarity.
 *
 * Optional filters:
 *   - textFileId  → scope results to a single text file
 *   - type        → scope results to a specific block type (e.g. "paragraph")
 *   - limit       → max number of results (default 10)
 */
export const searchBlocks = action({
  args: {
    query: v.string(),
    textFileId: v.optional(v.id("text_files")),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, textFileId, type, limit }): Promise<Array<{ score: number; block: Record<string, unknown> | null }>> => {
    const embeddingModelUrl = process.env.EMBEDDING_384_MODEL_URL;

    if (!embeddingModelUrl) {
      throw new Error("[searchBlocks] EMBEDDING_384_MODEL_URL is not set.");
    }

    // ── 1. Embed the query ────────────────────────────────────────────────
    const response = await fetch(`${embeddingModelUrl}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: query }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[searchBlocks] Embedding server error (${response.status}): ${errText}`);
    }

    const { embeddings } = (await response.json()) as { embeddings: number[][] };
    const queryVector: number[] = embeddings?.[0] || [];

    if (!queryVector) {
      throw new Error("[searchBlocks] Embeddings server returned no vector.");
    }

    // ── 2. Vector search ──────────────────────────────────────────────────
    // Build a Convex VectorFilterBuilder callback only when filters are needed.
    const filterFn =
      textFileId || type
        ? (q: any) => {
            const clauses: any[] = [];
            if (textFileId) clauses.push(q.eq("textFileId", textFileId));
            if (type) clauses.push(q.eq("type", type));
            return clauses.length === 1 ? clauses[0] : q.and(...clauses);
          }
        : undefined;

    const results = await ctx.vectorSearch("blocks", "by_embeddedContent", {
      vector: queryVector,
      limit: limit ?? 10,
      ...(filterFn ? { filter: filterFn } : {}),
    });

    // ── 3. Hydrate block documents ────────────────────────────────────────
    const blocks = await ctx.runQuery(internal.requirements.embeddings.getBlocksByIds, {
      ids: results.map((r) => r._id),
    });

    // Re-attach the similarity score to each block and filter out any nulls
    return results
      .map((r) => ({
        score: r._score,
        block: blocks.find((b) => b?._id === r._id) ?? null,
      }))
      .filter((r) => r.block !== null);
  },
});

/**
 * Internal query: fetch multiple blocks by their IDs in one shot.
 * Used by searchBlocks to hydrate vector search results.
 */
export const getBlocksByIds = internalQuery({
  args: { ids: v.array(v.id("blocks")) },
  handler: async (ctx, { ids }) => {
    return await Promise.all(ids.map((id) => ctx.db.get(id)));
  },
});

// ── Helper ─────────────────────────────────────────────────────────────────
/**
 * Recursively extracts plain text from a BlockNote / Tiptap content array.
 * Adjust as needed to match your content schema.
 */
function extractTextFromContent(content: any): string {
  if (!content || !Array.isArray(content)) return "";
  return content
    .map((node) => {
      if (typeof node?.text === "string") return node.text;
      if (Array.isArray(node?.content)) return extractTextFromContent(node.content);
      return "";
    })
    .join(" ");
}
