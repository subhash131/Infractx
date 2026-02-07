import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";

export const GlobalBlockAttributes = Extension.create({
  name: "globalBlockAttributes",

  addGlobalAttributes() {
    return [
      {
        // Target your blocks
        types: [
          "paragraph", "heading", "smartBlock", "bulletList", "orderedList", 
          "listItem", "image", "table", "blockquote", "codeBlock"
        ],
        attributes: {
          id: {
            default: null,
            keepOnSplit: false, // Important: New blocks start empty
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => ({ "data-id": attributes.id }),
          },
          rank: {
            default: null,
            keepOnSplit: false, // Important: New blocks start empty
            parseHTML: (element) => element.getAttribute("data-rank"),
            renderHTML: (attributes) => ({ "data-rank": attributes.rank }),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("global-attributes-smart-rank"),
        appendTransaction: (transactions, oldState, newState) => {
          // 1. Check if document changed
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;
          const seenIds = new Set<string>();

          // 2. Iterate through all nodes
          newState.doc.descendants((node, pos) => {
            if (!node.isBlock || !("id" in node.attrs) || !("rank" in node.attrs)) return;

            let { id, rank } = node.attrs;
            let shouldUpdate = false;

            // --- A. Fix ID (Missing or Duplicate) ---
            if (!id || seenIds.has(id)) {
              id = uuidv4();
              shouldUpdate = true;
            }
            seenIds.add(id);

            // --- B. Fix Rank (Smart Insertion) ---
            // We need to check context: Previous Sibling & Next Sibling
            const $pos = newState.doc.resolve(pos);
            const parent = $pos.parent;
            const index = $pos.index(); // Index of this node in the parent

            // Get Prev Rank (if any)
            let prevRank = null;
            if (index > 0) {
              const prevNode = parent.child(index - 1);
              if (prevNode.attrs.rank) {
                prevRank = prevNode.attrs.rank;
              }
            }

            // Get Next Rank (if any) - This is the secret sauce to stop cascading
            let nextRank = null;
            if (index < parent.childCount - 1) {
              const nextNode = parent.child(index + 1);
              if (nextNode.attrs.rank) {
                nextRank = nextNode.attrs.rank;
              }
            }

            // Detect Invalid State:
            // 1. Missing rank
            // 2. Collision/Order issue: Current rank is not strictly greater than Prev rank
            const isOrderInvalid = prevRank && rank && rank <= prevRank;
            const isMissing = !rank;

            if (isMissing || isOrderInvalid) {
              // Generate a rank strictly BETWEEN prev and next.
              // If we insert at top: prev=null, next='a0' -> generates 'Z' (no cascade!)
              // If we insert at bottom: prev='a0', next=null -> generates 'a1'
              // If we insert middle: prev='a0', next='a1' -> generates 'a0V'
              rank = generateKeyBetween(prevRank, nextRank);
              shouldUpdate = true;
            }

            // --- C. Apply Changes ---
            if (shouldUpdate) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                id,
                rank,
              });
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});