import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    blocks: v.array(
      v.object({
        blockId: v.string(),
        docId: v.string(), // We can actually ignore this and set it server-side
        parentId: v.optional(v.string()),
        type: v.string(),
        props: v.any(),
        content: v.any(),
        rank: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // 1. Create the Document Metadata
    const docId = await ctx.db.insert("requirements", {
      title: args.title,
      docId: "",
      description: "",
    });

    // 2. Bulk Insert all Blocks
    // We overwrite the docId in the blocks to match the real DB ID
    await Promise.all(
      args.blocks.map(async (block) => {
        await ctx.db.insert("blocks", {
          ...block,
          docId: docId, // Link to the new document
        });
      }),
    );

    return docId;
  },
});
