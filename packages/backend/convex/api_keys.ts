
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { ConvexError } from "convex/values";
import { api } from "./_generated/api";

// Helper to generate a random key
function generateKey() {
  const array = new Uint8Array(32);
  // Convex runtime supports crypto.getRandomValues
  crypto.getRandomValues(array);
  return `sk_live_${Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export const generate = mutation({
  args: { name: v.optional(v.string()) },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }



    const key = generateKey();
    
    await ctx.db.insert("api_keys", {
      key,
      userId: identity.subject,
      name: args.name,
      orgId: identity.org_id?.toString() || undefined,
      createdAt: Date.now(),
    });

    return key;
  },
});

export const list = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty list if not authorized or throw?
      // Better to throw if this is an authenticated endpoint
      throw new ConvexError("Unauthorized");
    }

    return await ctx.db
      .query("api_keys")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const revoke = mutation({
  args: { id: v.id("api_keys") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
       // If it doesn't exist, we can just return, or throw.
       return; 
    }
    
    if (existing.userId !== identity.subject) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const validate = query({
  args: { key: v.string() },
  async handler(ctx, args) {
    const keyRecord = await ctx.db
      .query("api_keys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!keyRecord) return null;

    return {
      userId: keyRecord.userId,
      keyId: keyRecord._id,
      orgId: keyRecord.orgId,
    };
  },
});

