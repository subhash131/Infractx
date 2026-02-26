import { internalAction, internalMutation, internalQuery } from "../_generated/server";
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

// ── Helper ─────────────────────────────────────────────────────────────────
/**
 * Recursively extracts plain text from a BlockNote / Tiptap content array.
 * Adjust as needed to match your content schema.
 */
function extractTextFromContent(content: unknown): string {
  if (!content || !Array.isArray(content)) return "";
  return content
    .map((node: any) => {
      if (typeof node?.text === "string") return node.text;
      if (Array.isArray(node?.content)) return extractTextFromContent(node.content);
      return "";
    })
    .join(" ");
}
