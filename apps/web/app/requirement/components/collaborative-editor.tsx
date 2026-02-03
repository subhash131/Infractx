"use client";
import { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { AIExtension, AIMenuController } from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useCallback } from "react";
import "./styles.css";
import { FormattingToolbarWithAI } from "./formatting-toolbar-with-ai";
import { SuggestionMenuWithAI } from "./suggestion-menu-with-ai";
import { SuggestionMenuForRequirements } from "./suggestion-menu-for-requirements";
import { generateKeyBetween } from "fractional-indexing";

const BASE_URL = "https://localhost:3000/ai";

export default function CollaborativeEditor() {
  // 1. Store the "Last Known Server State" to compare against
  const lastSavedState = useRef<Block[]>([]);
  const isFirstLoad = useRef(true);

  const editor = useCreateBlockNote({
    dictionary: { ...en, ai: aiEn },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: `${BASE_URL}/regular/streamText`,
        }),
      }),
    ],
    initialContent: [],
  });

  // 2. The Sync Logic (Debounced)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      console.log("⚡ Calculating Diff...");

      const currentBlocks = editor.document;

      // RUN THE SMART DIFF ENGINE
      const { toCreate, toUpdate, toDelete } = calculateSmartDiff(
        lastSavedState.current, // Old state (DB)
        currentBlocks, // New state (Editor)
      );

      // Log results
      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        console.group("📝 Syncing Changes to DB");
        if (toCreate.length) console.log("🟢 To CREATE:", toCreate);
        if (toUpdate.length) console.log("🟡 To UPDATE:", toUpdate);
        if (toDelete.length) console.log("🔴 To DELETE:", toDelete);
        console.groupEnd();

        // Update "Last Known State" only after successful sync
        lastSavedState.current = JSON.parse(JSON.stringify(currentBlocks));
      } else {
        console.log("No changes detected (clean).");
      }
    }, 1000);
  }, [editor]);

  // 3. Attach Listener
  useEffect(() => {
    if (!editor) return;

    if (isFirstLoad.current) {
      lastSavedState.current = JSON.parse(JSON.stringify(editor.document));
      isFirstLoad.current = false;
    }

    const unsubscribe = editor.onChange(() => {
      triggerSync();
    });

    return unsubscribe;
  }, [editor, triggerSync]);

  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      style={{ minHeight: "100vh" }}
    >
      <AIMenuController />
      <FormattingToolbarWithAI />
      <SuggestionMenuWithAI editor={editor} />
      <SuggestionMenuForRequirements editor={editor} />
    </BlockNoteView>
  );
}

function calculateSmartDiff(oldBlocks: Block[], newBlocks: Block[]) {
  const oldMap = new Map<
    string,
    { block: Block; rank: string; parentId: string | null }
  >();
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const processedIds = new Set<string>();

  // 1. Faster Indexing (Flat map for O(1) lookups)
  const indexOld = (
    blocks: Block[],
    parent: string | null = null,
    prevRank: string | null = null,
  ) => {
    let currentRank = prevRank;
    for (const b of blocks) {
      currentRank = generateKeyBetween(currentRank, null);
      oldMap.set(b.id, { block: b, parentId: parent, rank: currentRank });
      if (b.children && b.children.length > 0) {
        indexOld(b.children, b.id, null);
      }
    }
  };
  indexOld(oldBlocks);

  // 2. Efficient Content Comparison
  const hasContentChanged = (newContent: any, oldContent: any) => {
    if (typeof newContent !== typeof oldContent) return true;
    if (Array.isArray(newContent)) {
      if (newContent.length !== oldContent.length) return true;
      return newContent.some((item, i) => item.text !== oldContent[i].text);
    }
    return false;
  };

  // 3. Build a position map for existing blocks in the NEW state
  const buildPositionMap = (
    blocks: Block[],
    parentId: string | null = null,
  ) => {
    const map = new Map<string, { index: number; parentId: string | null }>();

    const traverse = (items: Block[], parent: string | null = null) => {
      for (let i = 0; i < items.length; i++) {
        map.set(items[i]!.id, { index: i, parentId: parent });
        if (items[i]!.children && items[i]!.children.length > 0) {
          traverse(items[i]!.children!, items[i]!.id);
        }
      }
    };

    traverse(blocks, parentId);
    return map;
  };

  const newPositionMap = buildPositionMap(newBlocks);

  const traverse = (blocks: Block[], parentId: string | null = null) => {
    let prevRank: string | null = null;
    let prevOldRank: string | null = null; // Track the previous EXISTING block's rank

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block) continue;
      const nextBlock = blocks[i + 1];
      processedIds.add(block.id);

      const oldEntry = oldMap.get(block.id);
      const nextOldEntry = nextBlock ? oldMap.get(nextBlock.id) : null;

      let targetRank: string;
      let updateReason: string | null = null;

      if (!oldEntry) {
        // --- NEW BLOCK ---
        // Find the rank bounds: previous existing block and next existing block
        const nextExistingRank = nextOldEntry?.rank || null;

        const safeGenerateRank = (prev: string | null, next: string | null) => {
          if (prev && next && prev >= next) {
            // If indices have collided or crossed, fallback to appending after prev
            return generateKeyBetween(prev, null);
          }
          return generateKeyBetween(prev, next);
        };

        targetRank = safeGenerateRank(prevOldRank, nextExistingRank);
        console.log(
          `🆕 New Block [${block.id.slice(0, 4)}]: Assigned ${targetRank} (between ${prevOldRank} and ${nextExistingRank})`,
        );
      } else {
        // --- EXISTING BLOCK ---
        const movedParent = oldEntry.parentId !== parentId;

        // KEY FIX: Check if this block's relative position changed among existing blocks
        // Find the previous and next EXISTING blocks in the new state
        let prevExistingBlockId: string | null = null;
        let nextExistingBlockId: string | null = null;

        for (let j = i - 1; j >= 0; j--) {
          if (oldMap.has(blocks[j]!.id)) {
            prevExistingBlockId = blocks[j]!.id;
            break;
          }
        }

        for (let j = i + 1; j < blocks.length; j++) {
          if (oldMap.has(blocks[j]!.id)) {
            nextExistingBlockId = blocks[j]!.id;
            break;
          }
        }

        const prevExistingRank = prevExistingBlockId
          ? oldMap.get(prevExistingBlockId)?.rank || null
          : null;
        const nextExistingRank = nextExistingBlockId
          ? oldMap.get(nextExistingBlockId)?.rank || null
          : null;

        // Only consider it moved if its rank is outside the bounds of its neighbors
        let orderViolated = false;
        if (prevExistingRank && oldEntry.rank <= prevExistingRank) {
          orderViolated = true;
        }
        if (nextExistingRank && oldEntry.rank >= nextExistingRank) {
          orderViolated = true;
        }

        if (movedParent || orderViolated) {
          targetRank = generateKeyBetween(prevExistingRank, nextExistingRank);
          updateReason = movedParent
            ? "Parent Changed"
            : `Order Violation (Between ${prevExistingRank} and ${nextExistingRank}, Current: ${oldEntry.rank})`;
        } else {
          // Happy Path: No rank change needed
          targetRank = oldEntry.rank;
        }

        // Update prevOldRank to track existing blocks
        prevOldRank = targetRank;
      }

      // CHANGE DETECTION (Content/Props)
      if (!oldEntry) {
        toCreate.push({ ...block, rank: targetRank, parentId });
      } else {
        const contentChanged = hasContentChanged(
          block.content,
          oldEntry.block.content,
        );
        const propsChanged =
          JSON.stringify(block.props) !== JSON.stringify(oldEntry.block.props);

        if (updateReason || contentChanged || propsChanged) {
          if (updateReason)
            console.warn(
              `⚠️ Updating [${block.id.slice(0, 4)}]: ${updateReason}`,
            );
          toUpdate.push({
            id: block.id,
            ...(updateReason ? { rank: targetRank, parentId } : {}),
            ...(contentChanged ? { content: block.content } : {}),
            ...(propsChanged ? { props: block.props } : {}),
          });
        }
      }

      prevRank = targetRank;
      if (block.children?.length) traverse(block.children, block.id);
    }
  };

  traverse(newBlocks);

  // 4. Detect Deletes
  const toDelete: string[] = [];
  for (const key of oldMap.keys()) {
    if (!processedIds.has(key)) toDelete.push(key);
  }

  return { toCreate, toUpdate, toDelete };
}
