"use client";
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
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useQueryState } from "nuqs";
import { transformToBlockNoteStructure } from "./utils/transform-to-blocknote-structure";
import { schema, CustomBlock, CustomBlockNoteEditor } from "./custom-blocks/schema";
import { calculateSmartDiff } from "./utils/calculate-smart-diff";
import { handleKeyDown } from "./key-handlers/handle-keydown";


const BASE_URL = "https://localhost:3000/ai";

// Sanitize function to clean data before sending to Convex 
// for table data
function sanitizeForConvex(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return null;
  
  // Handle string "undefined" - these should be omitted entirely
  if (typeof obj === 'string' && obj === 'undefined') return null;
  
  if (Array.isArray(obj)) {
    // For arrays, map each item
    const cleaned = obj.map(sanitizeForConvex).filter(item => item !== null);
    return cleaned;
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = sanitizeForConvex(value);
      // Only include if not null/undefined, but allow empty arrays and empty objects
      if (cleanValue !== null && cleanValue !== undefined) {
        sanitized[key] = cleanValue;
      }
    }
    return sanitized;
  }
  
  return obj;
}

export default function CollaborativeEditor() {
  const [fileId] = useQueryState("fileId");
  const lastSavedState = useRef<CustomBlock[]>([]);
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

  const editor: CustomBlockNoteEditor = useCreateBlockNote({
    dictionary: { ...en, ai: aiEn },
    schema,

    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: `${BASE_URL}/regular/streamText`,
        }),
      }),
    ],
    initialContent: [{}],
    _tiptapOptions:{
      editorProps:{
        handleKeyDown: (view,event)=>{
          return handleKeyDown(view,event,editor)
        }, 
      }
    }
  });

  // Load blocks from DB
  useEffect(() => {
    if (savedBlocks === undefined) return;

    const transformed = transformToBlockNoteStructure(savedBlocks);
    const transformedHash = JSON.stringify(transformed);
    
    const isOurOwnEcho = transformedHash === JSON.stringify(lastSavedState.current);
    
    if (isSyncing.current) {
      // console.log("Ignoring DB update - sync in progress");
      return;
    }

    if (isFirstLoad.current) {
      if (savedBlocks.length > 0) {
        // console.log("INITIAL LOAD - Extracting ranks from DB blocks");
        
        // Extract ranks from DB blocks
        const extractRanks = (blocks: any[]) => {
          for (const block of blocks) {
            if (block.rank) {
              blockRanks.current.set(block.externalId, block.rank);
              // consoleg(`Stored rank for [${block.externalId.slice(0, 6)}]: ${block.rank}`);
            }
            if (block.children?.length) extractRanks(block.children);
          }
        };
        extractRanks(savedBlocks);
        
        // Wrap in setTimeout to avoid flushSync errors during render
        setTimeout(() => {
          isLoadingFromDB.current = true;
          editor.replaceBlocks(editor.document, transformed);
          lastSavedState.current = JSON.parse(JSON.stringify(transformed));
          
          setTimeout(() => {
            isLoadingFromDB.current = false;
          }, 100);
        }, 0);
      }
      isFirstLoad.current = false;
    } else {
      if (!isOurOwnEcho) {
        const isSameAsEditor = transformedHash === JSON.stringify(editor.document);
        
        if (!isSameAsEditor) {
          // consoleg("Applying Remote Update - Re-extracting ranks");
          
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
          
          // Wrap in setTimeout to avoid flushSync errors during render
          setTimeout(() => {
            isLoadingFromDB.current = true;
            editor.replaceBlocks(editor.document, transformed);
            lastSavedState.current = JSON.parse(JSON.stringify(transformed));

            setTimeout(() => {
              isLoadingFromDB.current = true;
            }, 100);
          }, 0);
        } else {
          lastSavedState.current = JSON.parse(JSON.stringify(transformed));
        }
      } else {
        // consoleg("Ignoring own echo from DB");
      }
    }
  }, [savedBlocks, editor]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = useCallback(() => {
    if (isLoadingFromDB.current) {
      // consoleg("Skipping sync - loading from DB");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      // consoleg("Calculating Diff...");
      // consoleg("Current blockRanks map has", blockRanks.current.size, "entries");
      
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
            console.log("To CREATE:", toCreate, "blocks");
            const blocksToInsert = toCreate.map((block) => {
              // consoleg(`CREATE [${block.id.slice(0, 6)}] with rank: ${block.rank}`);
              
              // Log original content if it's a table
              if (block.type === 'table') {
                // consoleg(`Original table content:`, JSON.stringify(block.content, null, 2));
              }
              const sanitizedBlock = {
                externalId: block.id,
                type: block.type,
                props: sanitizeForConvex(block.props),
                content: sanitizeForConvex(block.content),
                rank: block.rank,
                parentId: block.parentId ?? null,
                semanticType: block.props.semanticType ?? "default",
              };
              return sanitizedBlock;
            });

            await bulkInsertData({
              textFileId: fileId as Id<"text_files">,
              blocks: blocksToInsert,
            });
          }
          
          if (toUpdate.length) {
            console.log("🟡 To UPDATE:", toUpdate, "blocks");
            const blocksToUpdate = toUpdate.map((block) => {
              if (block.rank) {
                // // consoleg(`UPDATE [${block.id.slice(0, 6)}] with new rank: ${block.rank}`);
                // Rank already stored during traversal
              }
              
              const sanitizedBlock: any = {
                externalId: block.id,
              };
              
              if (block.content !== undefined) {
                sanitizedBlock.content = sanitizeForConvex(block.content);
              }
              if (block.type !== undefined) {
                sanitizedBlock.type = block.type;
              }
              if (block.props !== undefined) {
                sanitizedBlock.props = sanitizeForConvex(block.props);
              }
              if (block.rank !== undefined) {
                sanitizedBlock.rank = block.rank;
              }
              if (block.parentId !== undefined) {
                sanitizedBlock.parentId = block.parentId;
              }
              
              return sanitizedBlock;
            });
            await bulkUpdateData({ 
              blocks: blocksToUpdate,
              textFileId: fileId as Id<"text_files"> 
            });
          }
          
          if (toDelete.length) {
            // console.log("🔴 To DELETE:", toDelete, "blocks");
            toDelete.forEach(id => {
              blockRanks.current.delete(id);
              // console.log(`Removed rank for [${id.slice(0, 6)}]`);
            });
            await bulkDeleteData({ externalIds: toDelete });
          }
          
          // console.log("Final blockRanks map size:", blockRanks.current.size);
          console.groupEnd();
          
          lastSavedState.current = JSON.parse(JSON.stringify(currentBlocks));
          
        } catch (error) {
          console.error("❌ Sync failed:", error);
        } finally {
          setTimeout(() => {
            isSyncing.current = true;
          }, 100);
        }
      } else {
        // consoleg("No changes detected (clean).");
        isSyncing.current = true;
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

