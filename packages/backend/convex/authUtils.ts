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
 * Verify user has access to canvas with minimum role
 */
export async function verifyCanvasAccess(
  ctx: AuthContext,
  canvasId: Id<"canvases">,
  userId: string,
  minRole: "owner" | "editor" | "viewer" = "editor"
): Promise<void> {
  const collaborator = await ctx.db
    .query("collaborators")
    .withIndex("by_canvas_user", (q) =>
      q.eq("canvasId", canvasId).eq("userId", userId)
    )
    .first();

  if (!collaborator) {
    throw new Error("No access to this canvas");
  }

  const roleHierarchy: Record<string, number> = {
    viewer: 0,
    editor: 1,
    owner: 2,
  };

  const collaboratorRole = collaborator.role;

  if (
    !collaboratorRole ||
    !roleHierarchy[collaboratorRole] ||
    !roleHierarchy[minRole] ||
    roleHierarchy[collaboratorRole] < roleHierarchy[minRole]
  ) {
    throw new Error("Insufficient permissions");
  }
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

/**
 * Verify user can edit canvas
 */
export async function verifyCanvasEdit(
  ctx: AuthContext,
  canvasId: Id<"canvases">,
  userId: string
): Promise<void> {
  await verifyCanvasAccess(ctx, canvasId, userId, "editor");
}

/**
 * Verify user can view canvas
 */
export async function verifyCanvasView(
  ctx: AuthContext,
  canvasId: Id<"canvases">,
  userId: string
): Promise<void> {
  await verifyCanvasAccess(ctx, canvasId, userId, "viewer");
}
