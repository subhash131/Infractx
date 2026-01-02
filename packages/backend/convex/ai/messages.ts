import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const insertMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    prompt: v.string(),
    context: v.optional(v.array(v.any())),
    role: v.union(v.literal("USER"), v.literal("AI"), v.literal("SYSTEM")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { conversationId, prompt, role, context } = args;
    if (!identity) {
      return new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const res = await ctx.db.insert("messages", {
      conversationId,
      message: {
        content: prompt,
        role,
        context,
      },
    });

    return res;
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { conversationId } = args;
    if (!conversationId)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    if (!identity)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .collect();
    return messages;
  },
});
