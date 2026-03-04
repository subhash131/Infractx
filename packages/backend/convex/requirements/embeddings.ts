import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";


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
    const { block, parentText } = await ctx.runQuery(internal.requirements.embeddings.getBlockWithParent, { blockId });

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
    let text = extractTextFromContent(block.content);
    
    // Add parent text constraint to the current block's vector data
    if (parentText && parentText.trim().length > 0) {
        text = `## Parent Context:\n${parentText}\n\n## Block Content:\n${text}`;
    }

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
 * Internal query: fetch a block by ID (used inside the action above) along with its parent's text context if available.
 */
export const getBlockWithParent = internalQuery({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }: { blockId: Id<"blocks"> }) => {
    const block = await ctx.db.get(blockId);
    if (!block) return { block: null, parentText: "" };

    let parentText = "";
    if (block.parentId) {
      // Find the parent block by its externalId
      const parentBlock = await ctx.db
        .query("blocks")
        .withIndex("by_external_id", (q: any) => q.eq("externalId", block.parentId!))
        .unique();

      if (parentBlock) {
        if (parentBlock.type === "smartBlock") {
          // If parent is a smartBlock, fetch ALL children to represent the full smartBlock context
          const siblings = await ctx.db
            .query("blocks")
            .withIndex("by_text_file", (q: any) => q.eq("textFileId", block.textFileId))
            .collect();
            
          const smartBlockChildren = siblings.filter((s: any) => s.parentId === parentBlock.externalId);
          // Sort children by rank or order if needed. Here we just concatenate them.
          const smartBlockText = smartBlockChildren
            .map((child: any) => extractTextFromContent(child.content))
            .filter((t: string) => t.trim().length > 0)
            .join("\n");
            
          // Parent text includes the smartBlock's own content + all its children
          parentText = extractTextFromContent(parentBlock.content) + "\n" + smartBlockText;
        } else {
          // Normal block parent, just extract its text directly
          parentText = extractTextFromContent(parentBlock.content);
        }
      }
    }

    return { block, parentText };
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
    const existing = await ctx.db
      .query("embeddings")
      .withIndex("by_block", (q) => q.eq("blockId", blockId))
      .unique();

    if (embedding === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else {
      const block = await ctx.db.get(blockId);
      if (block) {
        const textFile = await ctx.db.get(block.textFileId);
        const documentId = textFile?.documentId;

        if (existing) {
          await ctx.db.patch(existing._id, {
            embedding,
            blockType: block.type,
            textFileId: block.textFileId,
            documentId: documentId,
          });
        } else {
          await ctx.db.insert("embeddings", {
            embeddingType: "block",
            blockId,
            blockType: block.type,
            textFileId: block.textFileId,
            documentId: documentId,
            embedding,
          });
        }
      }

      await ctx.db.patch(blockId, {
        pendingEmbedJobId: null, // clear the job reference once done
      });
    }
  },
});

/**
 * Internal action: embeds a text_file's title and description.
 */
export const embedTextFile = internalAction({
  args: {
    textFileId: v.id("text_files"),
  },
  handler: async (ctx, { textFileId }) => {
    const textFile = await ctx.runQuery(api.requirements.textFiles.getTextFileById, { fileId: textFileId });


    if (!textFile) {
      console.warn(`[embedTextFile] TextFile ${textFileId} not found, skipping.`);
      return;
    }

    const embeddingModelUrl = process.env.EMBEDDING_384_MODEL_URL;

    if (!embeddingModelUrl) {
      console.error("[embedTextFile] EMBEDDING_384_MODEL_URL is not set.");
      return;
    }

    // Combine title and description
    let textToEmbed = textFile.title;
    if (textFile.description) {
      textToEmbed += `\n\n${textFile.description}`;
    }

    if (!textToEmbed || textToEmbed.trim().length === 0) {
      console.log(`[embedTextFile] TextFile ${textFileId} has no text, skipping embed.`);
      await ctx.runMutation(internal.requirements.embeddings.saveTextFileEmbedding, {
        textFileId,
        embedding: null,
      });
      return;
    }

    // Call the embeddings server
    const response = await fetch(`${embeddingModelUrl}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: textToEmbed }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[embedTextFile] Embedding server error (${response.status}): ${errText}`);
      return;
    }

    const { embeddings } = (await response.json()) as { embeddings: number[][] };
    const embedding: number[] | null = embeddings?.[0] ?? null;

    // Persist embedding back to the file
    await ctx.runMutation(internal.requirements.embeddings.saveTextFileEmbedding, {
      textFileId,
      embedding,
    });

    console.log(`[embedTextFile] Embedded textFile ${textFileId}`);
  },
});

/**
 * Internal mutation: saves the computed embedding for a text file.
 */
export const saveTextFileEmbedding = internalMutation({
  args: {
    textFileId: v.id("text_files"),
    embedding: v.union(v.array(v.float64()), v.null()),
  },
  handler: async (ctx, { textFileId, embedding }) => {
    const existingList = await ctx.db
      .query("embeddings")
      .withIndex("by_text_file", (q) => q.eq("textFileId", textFileId))
      .collect();
      
    // Find the specific embedding that represents the file itself, not its blocks
    const existing = existingList.find(e => e.embeddingType === "file");

    if (embedding === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else {
      const textFile = await ctx.db.get(textFileId);
      if (textFile) {
        if (existing) {
          await ctx.db.patch(existing._id, {
            embedding,
            documentId: textFile.documentId,
          });
        } else {
          await ctx.db.insert("embeddings", {
            embeddingType: "file",
            textFileId: textFile._id,
            documentId: textFile.documentId,
            embedding,
          });
        }
      }
    }
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
  handler: async (ctx, { query, textFileId, type, limit }: { query: string; textFileId?: Id<"text_files">; type?: string; limit?: number }): Promise<Array<{ score: number; block: Record<string, unknown> | null }>> => {
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


    const limitNum = limit ?? 10;
    // We pull more results from the vector search because we have to post-filter.
    // Convex vector filters do not support "and", so we apply the most restrictive
    // filter first, then filter the rest in JavaScript.
    const vectorResults = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: queryVector,
      limit: limitNum * 5,
      filter: (q) => {
        if (textFileId) return q.eq("textFileId", textFileId);
        if (type) return q.eq("blockType", type);
        return q.eq("embeddingType", "block");
      },
    });

    const populatedResults = await ctx.runQuery(internal.requirements.embeddings.hydrateAndFilterBlocks, {
      results: vectorResults,
      limit: limitNum,
      textFileId,
      type,
    });

    return populatedResults;
  },
});

/**
 * Internal query: hydrate embedding documents, post-filter them to support logical AND,
 * and then fetch and attach the corresponding blocks.
 */
export const hydrateAndFilterBlocks = internalQuery({
  args: {
    results: v.array(v.object({ _id: v.id("embeddings"), _score: v.number() })),
    limit: v.number(),
    textFileId: v.optional(v.id("text_files")),
    type: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      results,
      limit,
      textFileId,
      type,
    }: {
      results: Array<{ _id: Id<"embeddings">; _score: number }>;
      limit: number;
      textFileId?: Id<"text_files">;
      type?: string;
    }
  ) => {
    const embeddings = await Promise.all(
      results.map(async (r: { _id: Id<"embeddings">; _score: number }) => {
        const doc = await ctx.db.get(r._id);
        if (!doc) return null;
        return { ...doc, _score: r._score };
      })
    );

    const filteredEmbeddings = embeddings
      .flatMap((d) => {
        if (!d) return [];
        if (d.embeddingType !== "block") return [];
        if (textFileId && d.textFileId !== textFileId) return [];
        if (type && d.blockType !== type) return [];
        return [d];
      })
      .slice(0, limit);

    const populated = await Promise.all(
      filteredEmbeddings.map(async (doc) => {
        if (!doc.blockId) return null;
        const block = await ctx.db.get(doc.blockId);
        if (!block) return null;
        return { score: doc._score, block };
      })
    );

    return populated.filter((item) => item !== null) as Array<{ score: number; block: Record<string, unknown> }>;
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
