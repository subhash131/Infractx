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
import { generateRank } from "./utils/rank-generator";
import { SuggestionMenuForRequirements } from "./suggestion-menu-for-requirements";

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
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Smart Diffing Demo",
      },
      {
        type: "paragraph",
        content:
          "Open your console. Add a line at the top. Notice only 1 Create log!",
      },
    ],
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

// ==========================================
// 🧠 THE PRODUCTION DIFF ENGINE (Smart)
// ==========================================

// Helper: Mock Lexorank generator (Finds string between two strings)
// In PROD: Replace this function with `import { generateKeyBetween } from 'fractional-indexing'`

function calculateSmartDiff(oldBlocks: Block[], newBlocks: Block[]) {
  // 1. Index Old Blocks (Simulating DB State)
  // We need to know what Ranks we assigned previously
  const oldMap = new Map<string, any>();

  // Helper to extract ranks from the "Last Saved" structure
  // In a real app, `lastSavedState` would already be flat or carry ranks.
  // Here we reconstruct ranks assuming sequential order if missing.
  const indexOld = (
    blocks: Block[],
    parent: string | null,
    startRank = 1000,
  ) => {
    blocks.forEach((b, i) => {
      const rank = `0|${(startRank + i * 1000).toString().padStart(6, "0")}`;
      oldMap.set(b.id, { ...b, parentId: parent, rank }); // Store assumed DB rank
      if (b.children) indexOld(b.children, b.id, startRank + i * 1000);
    });
  };
  indexOld(oldBlocks, null);

  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const processedIds = new Set<string>();

  // 2. Traverse New Blocks to Determine Ranks
  const traverse = (blocks: Block[], parentId: string | null = null) => {
    let prevRank: string | null = null;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];
      if (!block) break;

      processedIds.add(block.id);
      const oldBlock = oldMap.get(block.id);

      let targetRank = oldBlock?.rank;
      let needsUpdate = false;

      // --- RANK LOGIC ---
      if (!oldBlock) {
        // A. New Block: Needs a rank between prev and next
        const nextRankHint = nextBlock ? oldMap.get(nextBlock.id)?.rank : null;
        targetRank = generateRank(prevRank, nextRankHint);
      } else {
        // B. Existing Block: Only move if order is violated
        if (oldBlock.parentId !== parentId) {
          // Changed parent -> needs new rank context
          const nextRankHint = nextBlock
            ? oldMap.get(nextBlock.id)?.rank
            : null;
          targetRank = generateRank(prevRank, nextRankHint);
          needsUpdate = true;
        } else if (prevRank && oldBlock.rank <= prevRank) {
          // Order violation -> needs repair
          const nextRankHint = nextBlock
            ? oldMap.get(nextBlock.id)?.rank
            : null;
          targetRank = generateRank(prevRank, nextRankHint);
          needsUpdate = true;
        } else {
          // Happy path: Keep old rank!
          targetRank = oldBlock.rank;
        }
      }

      // Update Cursor
      prevRank = targetRank;

      // --- BUILD OUTPUT ---
      if (!oldBlock) {
        toCreate.push({ ...block, rank: targetRank, parentId });
      } else {
        // Check content changes
        const contentChanged =
          JSON.stringify(block.content) !== JSON.stringify(oldBlock.content);
        const propsChanged =
          JSON.stringify(block.props) !== JSON.stringify(oldBlock.props);

        if (needsUpdate || contentChanged || propsChanged) {
          toUpdate.push({
            id: block.id,
            ...(needsUpdate ? { rank: targetRank, parentId } : {}),
            ...(contentChanged ? { content: block.content } : {}),
            ...(propsChanged ? { props: block.props } : {}),
          });
        }
      }

      if (block.children) traverse(block.children, block.id);
    }
  };

  traverse(newBlocks);

  // 3. Detect Deletes
  const toDelete: string[] = [];
  oldMap.forEach((v, k) => {
    if (!processedIds.has(k)) toDelete.push(k);
  });

  return { toCreate, toUpdate, toDelete };
}
