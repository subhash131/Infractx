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
  const lastSavedState = useRef<Block[]>([]);
  const isFirstLoad = useRef(true);
  const isLoadingFromDB = useRef(false);
  const isSyncing = useRef(false);
  
  // NEW: Store ranks separately since editor blocks don't persist them
  const blockRanks = useRef<Map<string, string>>(new Map());
  
  const savedBlocks = useQuery(
    api.requirements.textFileBlocks.getBlocksByFileId,
    fileId ? { textFileId: fileId as Id<"text_files"> } : "skip",
  );
  
  const bulkInsertData = useMutation(api.requirements.textFileBlocks.bulkCreate);
  const bulkUpdateData = useMutation(api.requirements.textFileBlocks.bulkUpdate);
  const bulkDeleteData = useMutation(api.requirements.textFileBlocks.bulkDelete);

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
    const transformedHash = JSON.stringify(transformed);
    
    const isOurOwnEcho = transformedHash === JSON.stringify(lastSavedState.current);
    
    if (isSyncing.current) {
      console.log("⏸️ Ignoring DB update - sync in progress");
      return;
    }

    if (isFirstLoad.current) {
      if (savedBlocks.length > 0) {
        console.log("📥 INITIAL LOAD - Extracting ranks from DB blocks");
        
        // Extract ranks from DB blocks
        const extractRanks = (blocks: any[]) => {
          for (const block of blocks) {
            if (block.rank) {
              blockRanks.current.set(block.externalId, block.rank);
              console.log(`  📌 Stored rank for [${block.externalId.slice(0, 6)}]: ${block.rank}`);
            }
            if (block.children?.length) extractRanks(block.children);
          }
        };
        extractRanks(savedBlocks);
        
        isLoadingFromDB.current = true;
        editor.replaceBlocks(editor.document, transformed);
        lastSavedState.current = JSON.parse(JSON.stringify(transformed));
        setTimeout(() => {
          isLoadingFromDB.current = false;
        }, 100);
      }
      isFirstLoad.current = false;
    } else {
      if (!isOurOwnEcho) {
        const isSameAsEditor = transformedHash === JSON.stringify(editor.document);
        
        if (!isSameAsEditor) {
          console.log("🔄 Applying Remote Update - Re-extracting ranks");
          
          // Re-extract ranks from updated DB blocks
          blockRanks.current.clear();
          const extractRanks = (blocks: any[]) => {
            for (const block of blocks) {
              if (block.rank) {
                blockRanks.current.set(block.externalId, block.rank);
              }
              if (block.children?.length) extractRanks(block.children);
            }
          };
          extractRanks(savedBlocks);
          
          isLoadingFromDB.current = true;
          editor.replaceBlocks(editor.document, transformed);
          lastSavedState.current = JSON.parse(JSON.stringify(transformed));
          setTimeout(() => {
            isLoadingFromDB.current = false;
          }, 100);
        } else {
          lastSavedState.current = JSON.parse(JSON.stringify(transformed));
        }
      } else {
        console.log("✅ Ignoring own echo from DB");
      }
    }
  }, [savedBlocks, editor]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = useCallback(() => {
    if (isLoadingFromDB.current) {
      console.log("⏸️ Skipping sync - loading from DB");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      console.log("⚡ Calculating Diff...");
      console.log("🗂️  Current blockRanks map has", blockRanks.current.size, "entries");
      
      isSyncing.current = true;

      const currentBlocks = editor.document;

      const { toCreate, toUpdate, toDelete } = calculateSmartDiff(
        lastSavedState.current,
        currentBlocks,
        blockRanks.current, // Pass the ranks map
      );

      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        console.group("📝 Syncing Changes to DB", fileId);
        
        try {
          if (toCreate.length) {
            console.log("🟢 To CREATE:", toCreate.length, "blocks");
            const blocksToInsert = toCreate.map((block) => {
              console.log(`  📦 CREATE [${block.id.slice(0, 6)}] with rank: ${block.rank}`);
              // Rank already stored during traversal
              return {
                externalId: block.id,
                type: block.type,
                props: block.props,
                content: block.content,
                rank: block.rank,
                parentId: block.parentId ?? null,
              };
            });

            await bulkInsertData({
              textFileId: fileId as Id<"text_files">,
              blocks: blocksToInsert,
            });
          }
          
          if (toUpdate.length) {
            console.log("🟡 To UPDATE:", toUpdate.length, "blocks");
            const blocksToUpdate = toUpdate.map((block) => {
              if (block.rank) {
                console.log(`  📦 UPDATE [${block.id.slice(0, 6)}] with new rank: ${block.rank}`);
                // Rank already stored during traversal
              }
              return {
                externalId: block.id,
                content: block.content,
                type: block.type,
                props: block.props,
                rank: block.rank,
                parentId: block.parentId,
              };
            });
            await bulkUpdateData({ 
              blocks: blocksToUpdate,
              textFileId: fileId as Id<"text_files"> 
            });
          }
          
          if (toDelete.length) {
            console.log("🔴 To DELETE:", toDelete.length, "blocks");
            toDelete.forEach(id => {
              blockRanks.current.delete(id);
              console.log(`  🗑️  Removed rank for [${id.slice(0, 6)}]`);
            });
            await bulkDeleteData({ externalIds: toDelete });
          }
          
          console.log("📊 Final blockRanks map size:", blockRanks.current.size);
          console.groupEnd();
          
          lastSavedState.current = JSON.parse(JSON.stringify(currentBlocks));
          
        } catch (error) {
          console.error("❌ Sync failed:", error);
        } finally {
          setTimeout(() => {
            isSyncing.current = false;
          }, 100);
        }
      } else {
        console.log("✅ No changes detected (clean).");
        isSyncing.current = false;
      }
    }, 1000);
  }, [editor, fileId, bulkInsertData, bulkUpdateData, bulkDeleteData]);

  useEffect(() => {
    if (!editor) return;

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

function calculateSmartDiff(
  oldBlocks: Block[], 
  newBlocks: Block[],
  blockRanks: Map<string, string> // NEW: Receive ranks map
) {
  const oldMap = new Map<string,
    { block: Block; rank: string; parentId: string | null }
  >();
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const processedIds = new Set<string>();

  // 1. Index old blocks AND populate with known ranks
  const indexOld = (blocks: Block[], parent: string | null = null) => {
    for (const b of blocks) {
      // Try to get rank from our persistent map
      const dbRank = blockRanks.get(b.id) || (b as any).rank || "";
      
      console.log(`  🔍 Indexing old [${b.id.slice(0, 6)}] with rank: ${dbRank || 'MISSING'}`);
      
      oldMap.set(b.id, { block: b, parentId: parent, rank: dbRank });
      
      if (b.children?.length) indexOld(b.children, b.id);
    }
  };
  
  console.log("🏗️  Building oldMap from lastSavedState...");
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

  // 3. Deep props comparison
  const hasPropsChanged = (newProps: any, oldProps: any) => {
    const normalize = (props: any) => {
      if (!props) return {};
      const normalized: any = {};
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined && value !== null && value !== '') {
          normalized[key] = value;
        }
      }
      return normalized;
    };

    const normalizedNew = normalize(newProps);
    const normalizedOld = normalize(oldProps);

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
    console.log(`\n📂 Traversing ${blocks.length} blocks (parent: ${parentId?.slice(0, 6) || 'root'})`);
    
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
        console.log(`\n🆕 NEW BLOCK [${block.id.slice(0, 6)}] at position ${i}`);
        
        // Find PREVIOUS block's rank
        let prevRank: string | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const prevId = blocks[j]!.id;
          const prevRankValue = blockRanks.get(prevId);
          if (prevRankValue) {
            prevRank = prevRankValue;
            console.log(`  ⬅️  Found prevRank from [${prevId.slice(0, 6)}]: ${prevRank}`);
            break;
          }
        }
        if (!prevRank) console.log(`  ⬅️  No previous rank (start of list)`);

        // Find NEXT block's rank
        let nextRank: string | null = null;
        for (let j = i + 1; j < blocks.length; j++) {
          const nextId = blocks[j]!.id;
          const nextRankValue = blockRanks.get(nextId);
          if (nextRankValue) {
            nextRank = nextRankValue;
            console.log(`  ➡️  Found nextRank from [${nextId.slice(0, 6)}]: ${nextRank}`);
            break;
          }
        }
        if (!nextRank) console.log(`  ➡️  No next rank (end of list)`);

        targetRank = generateKeyBetween(prevRank, nextRank);
        console.log(`  ✨ Generated rank: ${targetRank}`);
        
        // CRITICAL: Store the rank IMMEDIATELY so next blocks can use it
        blockRanks.set(block.id, targetRank);
        console.log(`  💾 Stored rank in map for future blocks`);
        
        toCreate.push({ ...block, rank: targetRank, parentId });
        
      } else {
        // --- EXISTING BLOCK ---
        targetRank = oldEntry.rank;
        console.log(`\n♻️  EXISTING BLOCK [${block.id.slice(0, 6)}] current rank: ${targetRank || 'MISSING'}`);
        
        // Check if parent changed
        const movedParent = oldEntry.parentId !== parentId;
        
        if (movedParent) {
          console.log(`  🔄 PARENT CHANGED! Old: ${oldEntry.parentId?.slice(0, 6) || 'root'} → New: ${parentId?.slice(0, 6) || 'root'}`);
          
          // Find PREVIOUS block's rank
          let prevRank: string | null = null;
          for (let j = i - 1; j >= 0; j--) {
            const prevId = blocks[j]!.id;
            const prevRankValue = blockRanks.get(prevId);
            if (prevRankValue) {
              prevRank = prevRankValue;
              console.log(`  ⬅️  Found prevRank from [${prevId.slice(0, 6)}]: ${prevRank}`);
              break;
            }
          }

          // Find NEXT block's rank
          let nextRank: string | null = null;
          for (let j = i + 1; j < blocks.length; j++) {
            const nextId = blocks[j]!.id;
            const nextRankValue = blockRanks.get(nextId);
            if (nextRankValue) {
              nextRank = nextRankValue;
              console.log(`  ➡️  Found nextRank from [${nextId.slice(0, 6)}]: ${nextRank}`);
              break;
            }
          }
          
          targetRank = generateKeyBetween(prevRank, nextRank);
          needsRankUpdate = true;
          updateReason = "Parent Changed";
          console.log(`  ✨ Generated new rank: ${targetRank}`);
          
          // CRITICAL: Store the updated rank IMMEDIATELY
          blockRanks.set(block.id, targetRank);
          console.log(`  💾 Stored updated rank in map`);
        }

        // Check for content/props changes
        const contentChanged = hasContentChanged(block.content, oldEntry.block.content);
        const propsChanged = hasPropsChanged(block.props, oldEntry.block.props);
        const typeChanged = block.type !== oldEntry.block.type;

        if (contentChanged) console.log(`  📝 Content changed`);
        if (propsChanged) console.log(`  ⚙️  Props changed`);
        if (typeChanged) console.log(`  🔄 Type changed`);

        if (needsRankUpdate || contentChanged || propsChanged || typeChanged) {
          const updatePayload: any = { id: block.id };
          
          if (needsRankUpdate) {
            updatePayload.rank = targetRank;
            updatePayload.parentId = parentId;
          }
          if (contentChanged) updatePayload.content = block.content;
          if (propsChanged) updatePayload.props = block.props;
          if (typeChanged) updatePayload.type = block.type;
          
          toUpdate.push(updatePayload);
        }
      }

      // Recurse into children
      if (block.children?.length) traverse(block.children, block.id);
    }
  };

  traverse(newBlocks);

  // 4. Detect Deletes
  const toDelete: string[] = [];
  for (const key of oldMap.keys()) {
    if (!processedIds.has(key)) {
      console.log(`🗑️  DELETED: [${key.slice(0, 6)}]`);
      toDelete.push(key);
    }
  }

  return { toCreate, toUpdate, toDelete };
}