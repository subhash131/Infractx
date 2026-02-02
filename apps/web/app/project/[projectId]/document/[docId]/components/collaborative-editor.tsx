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
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useQueryState } from "nuqs";
import { transformToBlockNoteStructure } from "./utils/transform-to-blocknote-structure";

const BASE_URL = "https://localhost:3000/ai";

export default function CollaborativeEditor() {
  const [fileId] = useQueryState("fileId");
  // 1. Store the "Last Known Server State" to compare against
  const lastSavedState = useRef<Block[]>([]);
  const isFirstLoad = useRef(true);
  const isLoadingFromDB = useRef(false);
  const savedBlocks = useQuery(
    api.requirements.textFileBlocks.getBlocksByFileId,
    fileId
      ? {
          textFileId: fileId as Id<"text_files">,
        }
      : "skip",
  );
  const bulkInsertData = useMutation(
    api.requirements.textFileBlocks.bulkCreate,
  );
  const bulkUpdateData = useMutation(
    api.requirements.textFileBlocks.bulkUpdate,
  );
  const bulkDeleteData = useMutation(
    api.requirements.textFileBlocks.bulkDelete,
  );

  const editor = useCreateBlockNote({
    dictionary: { ...en, ai: aiEn },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: `${BASE_URL}/regular/streamText`,
        }),
      }),
    ],
    initialContent: [{}],
  });

  // Load blocks from DB
  useEffect(() => {
    if (savedBlocks === undefined) return;

    const transformed = transformToBlockNoteStructure(savedBlocks);
    
    // Check if the incoming data is different from what we last saved/knew about
    // This allows collaboration (remote changes) while ignoring our own echoes
    const isSameAsLastSaved = JSON.stringify(transformed) === JSON.stringify(lastSavedState.current);

    if (isFirstLoad.current) {
        // Initial Load
        if (savedBlocks.length > 0) {
            isLoadingFromDB.current = true;
            editor.replaceBlocks(editor.document, transformed);
            lastSavedState.current = JSON.parse(JSON.stringify(transformed));
            setTimeout(() => {
                isLoadingFromDB.current = false;
            }, 100);
        }
        isFirstLoad.current = false;
    } else {
        // Subsequent Updates (Collaboration)
        if (!isSameAsLastSaved) {
            // Also check if matches current editor state to avoid disruptive re-renders if content is effectively same
             const isSameAsEditor = JSON.stringify(transformed) === JSON.stringify(editor.document);
             
             if (!isSameAsEditor) {
                console.log("🔄 Apply Remote Update");
                isLoadingFromDB.current = true;
                editor.replaceBlocks(editor.document, transformed);
                lastSavedState.current = JSON.parse(JSON.stringify(transformed));
                setTimeout(() => {
                   isLoadingFromDB.current = false;
                }, 100);
             } else {
                // Determine if we should update lastSavedState anyway to sync ranks/ids?
                // Yes, better keep it in sync with server truth
                lastSavedState.current = JSON.parse(JSON.stringify(transformed));
             }
        }
    }
  }, [savedBlocks, editor]);


  // 2. The Sync Logic (Debounced)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = useCallback(() => {
    // Skip sync if we're loading from the database
    if (isLoadingFromDB.current) {
      console.log("⏸️ Skipping sync - loading from DB");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      console.log("⚡ Calculating Diff...");

      const currentBlocks = editor.document;

      // RUN THE SMART DIFF ENGINE
      const { toCreate, toUpdate, toDelete } = calculateSmartDiff(
        lastSavedState.current, // Old state (DB)
        currentBlocks, // New state (Editor)
      );

      // Log results
      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        console.group("📝 Syncing Changes to DB", fileId);
        if (toCreate.length) {
          console.log("🟢 To CREATE:", toCreate);
          console.log("🟢 To CREATE:", toCreate);
          const blocksToInsert = toCreate.map((block) => ({
            externalId: block.id,
            type: block.type,
            props: block.props,
            content: block.content,
            rank: block.rank,
            parentId: block.parentId ?? null,
          }));

          await bulkInsertData({
            textFileId: fileId as Id<"text_files">,
            blocks: blocksToInsert,
          });
        }
        if (toUpdate.length) {
          console.log("🟡 To UPDATE:", toUpdate);
          const blocksToUpdate = toUpdate.map((block) => {
            console.log(block);
            return {
              externalId: block.id,
              content: block.content,
              props: block.props,
              rank: block.rank,
              parentId: block.parentId,
            };
          });
          await bulkUpdateData({ blocks: blocksToUpdate,textFileId:fileId as Id<"text_files"> });
        }
        if (toDelete.length) {
          console.log("🔴 To DELETE:", toDelete);
          await bulkDeleteData({ externalIds: toDelete });
        }
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

  // 1. Index old blocks
  const indexOld = (blocks: Block[], parent: string | null = null) => {
    for (const b of blocks) {
      const dbRank = (b as any).rank;
      oldMap.set(b.id, { block: b, parentId: parent, rank: dbRank });
      if (b.children?.length) indexOld(b.children, b.id);
    }
  };
  indexOld(oldBlocks);

  // 2. Content comparison helper
  const hasContentChanged = (newContent: any, oldContent: any) => {
    if (typeof newContent !== typeof oldContent) return true;
    if (Array.isArray(newContent)) {
      if (newContent.length !== oldContent.length) return true;
      return newContent.some((item, i) => item.text !== oldContent[i]?.text);
    }
    return false;
  };

  // 3. IMPROVED: Deep props comparison (ignore empty/default values)
  const hasPropsChanged = (newProps: any, oldProps: any) => {
    // Normalize props - remove undefined/null/empty string values
    const normalize = (props: any) => {
      if (!props) return {};
      const normalized: any = {};
      for (const [key, value] of Object.entries(props)) {
        // Skip empty/default values
        if (value !== undefined && value !== null && value !== '') {
          normalized[key] = value;
        }
      }
      return normalized;
    };

    const normalizedNew = normalize(newProps);
    const normalizedOld = normalize(oldProps);

    // Compare normalized props
    const newKeys = Object.keys(normalizedNew);
    const oldKeys = Object.keys(normalizedOld);

    if (newKeys.length !== oldKeys.length) return true;

    for (const key of newKeys) {
      if (normalizedNew[key] !== normalizedOld[key]) {
        return true;
      }
    }

    return false;
  };

  const traverse = (blocks: Block[], parentId: string | null = null) => {
    let prevExistingRank: string | null = null;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block) continue;
      
      processedIds.add(block.id);
      const oldEntry = oldMap.get(block.id);

      let targetRank: string;
      let needsRankUpdate = false;
      let updateReason: string | null = null;

      if (!oldEntry) {
        // --- NEW BLOCK ---
        let nextExistingRank: string | null = null;
        for (let j = i + 1; j < blocks.length; j++) {
          const nextOldEntry = oldMap.get(blocks[j]!.id);
          if (nextOldEntry) {
            nextExistingRank = nextOldEntry.rank;
            break;
          }
        }

        targetRank = generateKeyBetween(prevExistingRank, nextExistingRank);
        toCreate.push({ ...block, rank: targetRank, parentId });
        
      } else {
        // --- EXISTING BLOCK ---
        targetRank = oldEntry.rank;
        
        // Check if parent changed
        const movedParent = oldEntry.parentId !== parentId;
        
        if (movedParent) {
          let nextExistingRank: string | null = null;
          for (let j = i + 1; j < blocks.length; j++) {
            const nextOldEntry = oldMap.get(blocks[j]!.id);
            if (nextOldEntry) {
              nextExistingRank = nextOldEntry.rank;
              break;
            }
          }
          
          targetRank = generateKeyBetween(prevExistingRank, nextExistingRank);
          needsRankUpdate = true;
          updateReason = "Parent Changed";
        }

        // Check for content/props changes using improved comparison
        const contentChanged = hasContentChanged(block.content, oldEntry.block.content);
        const propsChanged = hasPropsChanged(block.props, oldEntry.block.props);
        const typeChanged = block.type !== oldEntry.block.type;

        if (needsRankUpdate || contentChanged || propsChanged || typeChanged) {
          const updatePayload: any = { id: block.id };
          
          if (needsRankUpdate) {
            updatePayload.rank = targetRank;
            updatePayload.parentId = parentId;
            console.warn(`⚠️ Rank Update [${block.id.slice(0, 4)}]: ${updateReason}`);
          }
          if (contentChanged) {
            updatePayload.content = block.content;
            console.log(`📝 Content Changed [${block.id.slice(0, 4)}]`);
          }
          if (propsChanged) {
            updatePayload.props = block.props;
            console.log(`🎨 Props Changed [${block.id.slice(0, 4)}]`, {
              old: oldEntry.block.props,
              new: block.props
            });
          }
          if (typeChanged) {
            updatePayload.type = block.type;
            console.log(`🔄 Type Changed [${block.id.slice(0, 4)}]`);
          }
          
          toUpdate.push(updatePayload);
        }

        prevExistingRank = targetRank;
      }

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