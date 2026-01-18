import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { name, description } = args;
    const _id = await ctx.db.insert("requirements", {
      name,
      description,
    });
    return { _id, success: true };
  },
});
