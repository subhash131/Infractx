import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { components } from "./_generated/api";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);
export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({
  async onSnapshot(ctx, id, snapshot, version) {
    // Example: extract plain text and store it on your own "figma-like" doc
    // (you can also store the raw snapshot JSON if you want)
    // For Tiptap/ProseMirror:
    // const schema = getSchema(extensions);
    // const node = schema.nodeFromJSON(JSON.parse(snapshot));
    // const content = node.textContent;
    // Then patch your own document table with the derived data
    // await ctx.db.patch(id as any, { lastSyncedContent: content, lastVersion: version });
  },
});
