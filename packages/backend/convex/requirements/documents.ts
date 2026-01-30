import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    type: v.union(v.literal("TEXT"), v.literal("CANVAS")),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: args.type,
      projectId: args.projectId,
    });

    return docId;
  },
});
