import { components } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({});

// 3. Define your OWN create mutation
export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const docId = `req-${Math.random().toString(36).slice(2, 9)}`;

    await prosemirrorSync.create(ctx, docId, {
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    const id = await ctx.db.insert("requirements", {
      title: args.title,
      docId: docId,
    });

    return { id, docId };
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("requirements").collect();
  },
});
