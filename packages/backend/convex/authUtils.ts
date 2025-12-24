import { Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Simple auth utility - can be enhanced with Clerk, Auth0, etc. later
 */

type AuthContext = QueryCtx | MutationCtx;

/**
 * Get authenticated user ID from context
 * Currently uses Convex auth, can be swapped for custom auth
 */
export async function getAuthenticatedUserId(
  ctx: AuthContext
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity?.subject) {
    throw new Error("Not authenticated");
  }

  return identity.subject;
}

/**
 * Verify user is canvas owner
 */
export async function verifyCanvasOwner(
  ctx: AuthContext,
  canvasId: Id<"canvases">,
  userId: string
): Promise<void> {
  const canvas = await ctx.db.get(canvasId);
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  if (canvas.ownerId !== userId) {
    throw new Error("Only the owner can perform this action");
  }
}
