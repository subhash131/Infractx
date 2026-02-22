import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      organizationId: identity.org_id?.toString(),
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    await ctx.db.insert("documents", {
      title: "New Text Document",
      description: "Default text document",
      type: "TEXT",
      projectId: projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  

    return projectId;
  },
});

export const getProjectsByOrganization = query({
  args: { },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", identity.org_id?.toString()),
      )
      .order("desc")
      .collect();

    // Check ownership or organization access
    // TODO: Add organization member check when implemented
    const hasOrgAccess = true;
    if (!hasOrgAccess) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized to access this file",
      });
    }

    return projects;
  },
});

export const getProjectById = query({
  args: { projectId: v.id("projects") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const response = {...project,documents}

    // TODO: Add organization member check when implemented
    const hasOrgAccess = true;

    if (!hasOrgAccess) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized to access this file",
      });
    }

    return response;
  },
});
