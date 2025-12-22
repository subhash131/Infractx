import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a comment
export const createComment = mutation({
  args: {
    canvasId: v.id("canvases"),
    objectId: v.optional(v.string()),
    content: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("comments", {
      canvasId: args.canvasId,
      objectId: args.objectId,
      userId: identity.subject,
      content: args.content,
      resolved: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return commentId;
  },
});

// Get comments for canvas
export const getCanvasComments = query({
  args: { canvasId: v.id("canvases") },
  async handler(ctx, args) {
    return await ctx.db
      .query("comments")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .order("desc")
      .collect();
  },
});

// Get comments for specific object
export const getObjectComments = query({
  args: { objectId: v.string() },
  async handler(ctx, args) {
    return await ctx.db
      .query("comments")
      .withIndex("by_object", (q) => q.eq("objectId", args.objectId))
      .order("desc")
      .collect();
  },
});

// Update comment
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.optional(v.string()),
    resolved: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const { commentId, ...updates } = args;
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("Comment not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || comment.userId !== identity.subject) {
      throw new Error("Only the author can edit this comment");
    }

    await ctx.db.patch(commentId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return commentId;
  },
});

// Delete comment
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  async handler(ctx, args) {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || comment.userId !== identity.subject) {
      throw new Error("Only the author can delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});

// Resolve comment thread
export const resolveCommentThread = mutation({
  args: {
    commentId: v.id("comments"),
  },
  async handler(ctx, args) {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user has access to canvas
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_canvas_user", (q) =>
        q.eq("canvasId", comment.canvasId).eq("userId", identity.subject)
      )
      .first();

    if (!collaborator) throw new Error("Not authorized");

    await ctx.db.patch(args.commentId, {
      resolved: true,
      updatedAt: Date.now(),
    });
  },
});
