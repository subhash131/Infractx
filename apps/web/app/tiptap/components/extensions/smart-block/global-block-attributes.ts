import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";

export const GlobalBlockAttributes = Extension.create({
  name: "globalBlockAttributes",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph", "heading", "smartBlock", "bulletList", "orderedList", 
          "listItem", "image", "table", "blockquote", "codeBlock"
        ],
        attributes: {
          id: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => ({ "data-id": attributes.id }),
          },
          rank: {
            default: null,
            keepOnSplit: false,
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
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;
          const seenIds = new Set<string>();

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
            const $pos = newState.doc.resolve(pos);
            const parent = $pos.parent;
            const index = $pos.index();

            // Get Prev Rank (if any)
            let prevRank: string | null = null;
            if (index > 0) {
              const prevNode = parent.child(index - 1);
              if (prevNode.attrs.rank) {
                prevRank = prevNode.attrs.rank;
              }
            }

            // Get Next Rank (if any)
            let nextRank: string | null = null;
            if (index < parent.childCount - 1) {
              const nextNode = parent.child(index + 1);
              if (nextNode.attrs.rank) {
                nextRank = nextNode.attrs.rank;
              }
            }

            // Detect Invalid State
            const isMissing = !rank;
            const isOrderInvalid = prevRank && rank && rank <= prevRank;
            
            // CRITICAL FIX: Also check if prevRank >= nextRank (corrupted data)
            const isRangeInvalid = prevRank && nextRank && prevRank >= nextRank;

            if (isMissing || isOrderInvalid || isRangeInvalid) {
              try {
                // If the range itself is invalid, we need to fix it
                if (isRangeInvalid) {
                  console.warn(`Invalid rank range detected: prev="${prevRank}" >= next="${nextRank}". Regenerating from prevRank.`);
                  // Generate after prevRank, ignoring the invalid nextRank
                  rank = generateKeyBetween(prevRank, null);
                } else {
                  // Normal case: generate between valid bounds
                  rank = generateKeyBetween(prevRank, nextRank);
                }
                shouldUpdate = true;
              } catch (error) {
                // Fallback: If generation still fails, create a fresh rank
                console.error(`Failed to generate rank between "${prevRank}" and "${nextRank}":`, error);
                rank = generateKeyBetween(null, null); // Start fresh
                shouldUpdate = true;
              }
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