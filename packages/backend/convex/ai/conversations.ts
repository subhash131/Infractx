import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";

export const startConversation = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { organizationId } = args;
    if (!identity) {
      return new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const conversationId = await ctx.db.insert("conversations", {
      organizationId,
      userId: identity.subject,
      title: "New Conversation",
    });

    return conversationId;
  },
});
