import { v } from "convex/values";
import { mutation } from "./_generated/server";

// 3. Define your OWN create mutation
export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const docId = `req-${Math.random().toString(36).slice(2, 9)}`;

    const id = await ctx.db.insert("requirements", {
      title: args.title,
      docId: docId,
    });

    return { id, docId };
  },
});
