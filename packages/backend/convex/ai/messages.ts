import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";

export const insertMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    context: v.optional(v.array(v.any())),
    role: v.union(v.literal("USER"), v.literal("AI"), v.literal("SYSTEM")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { conversationId, content, role, context } = args;
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const id = await ctx.db.insert("messages", {
      conversationId,
      message: {
        content,
        role,
        context,
      },
    });

    return id;
  },
});
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    role: v.union(v.literal("USER"), v.literal("AI"), v.literal("SYSTEM")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { messageId, content, role } = args;
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_id", (q) => q.eq("_id", messageId))
      .unique();

    const id = await ctx.db.patch(messageId, {
      message: {
        content: `${existingMessage?.message.content}| ${content}`,
        role,
      },
    });

    return id;
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
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
      .order("desc")
      .paginate(args.paginationOpts);
    return messages;
  },
});

export const getLastNMessages = query({
  args: {
    conversationId: v.id("conversations"),
    n: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { conversationId, n } = args;
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
      .order("desc")
      .take(n);
    return messages.reverse();
  },
});
