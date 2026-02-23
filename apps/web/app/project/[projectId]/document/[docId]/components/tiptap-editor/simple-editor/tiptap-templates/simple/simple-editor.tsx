"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- Tiptap Node ---
import "../../tiptap-node/blockquote-node/blockquote-node.scss"
import "../../tiptap-node/code-block-node/code-block-node.scss"
import "../../tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "../../tiptap-node/list-node/list-node.scss"
import "../../tiptap-node/image-node/image-node.scss"
import "../../tiptap-node/heading-node/heading-node.scss"
import "../../tiptap-node/paragraph-node/paragraph-node.scss"
import "../../tiptap-node/table-node/table-node.scss"

// --- Hooks ---
import { useIsBreakpoint } from "@/app/project/[projectId]/document/[docId]/components/tiptap-editor/simple-editor/hooks/use-is-breakpoint"
import { useWindowSize } from "@/app/project/[projectId]/document/[docId]/components/tiptap-editor/simple-editor/hooks/use-window-size"
import { useCursorVisibility } from "@/app/project/[projectId]/document/[docId]/components/tiptap-editor/simple-editor/hooks/use-cursor-visibility"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "../../../utils/tiptap-utils"
import { getMentionSuggestions } from "@/app/project/[projectId]/document/[docId]/components/tiptap-editor/simple-editor/utils/mention-utils"

// --- Styles ---
import "./simple-editor.scss"

import { Id } from "@workspace/backend/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { MobileToolbarContent } from "./mobile-toolbar-content"
import { MainToolbarContent } from "./main-toolbar-content"
import { debounce } from "lodash"
import { useConvex } from "convex/react"

import dynamic from "next/dynamic";

// --- Custom extensions ---
import { ImageUploadNode } from "../../tiptap-node/image-upload-node"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { SmartBlock } from "../../../extensions/smart-block"
import { SmartBlockContent } from "../../../extensions/smart-block/smart-block-content"
import { SmartBlockGroup } from "../../../extensions/smart-block/smart-block-group"
import { GlobalBlockAttributes } from "../../../extensions/smart-block/global-block-attributes"
import { BlockMention } from "../../../extensions/block-suggestions/block-mention"
import { SmartBlockMention } from "../../../extensions/smart-block-mention"
import { AIExtension } from "../../../extensions/ai-extension"
import { TableBlockExtensions } from "../../../extensions/table/block"
import { parseBlocksToTiptapDocument } from "../../../utils/parse-blocks-to-tiptap-doc"
import { BlockData } from "../../../extensions/types"
import { syncEditorToDatabase } from "../../../utils/sync-editor-to-database"
import { TableToolbar } from "../../tiptap-ui/table-toolbar/table-toolbar"
import { useChatStore } from "../../../store/chat-store"

const Toolbar = dynamic(
  () =>
    import("../../tiptap-ui-primitive/toolbar/toolbar").then(
      (mod) => mod.Toolbar
    ),
  { ssr: false }
);

import { useParams } from "next/navigation";

export function SimpleEditor({textFileId}:{textFileId:Id<"text_files">}) {
  const params = useParams();
  const docId = params.docId as Id<"documents">;
  
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const {setEditor} = useChatStore()
  const toolbarRef = useRef<HTMLDivElement>(null)
  
  const convex = useConvex();
  const file = useQuery(api.requirements.textFiles.getTextFileById, { fileId: textFileId });
  const ancestors = useQuery(api.requirements.textFiles.getAncestors, { fileId: textFileId });

  const allFiles = useQuery(api.requirements.textFiles.getFilesByDocumentId, { documentId: docId });
  const smartBlocks = useQuery(api.requirements.textFileBlocks.getSmartBlocks, { textFileId });
  
  // Use refs to avoid stale closures in the editor extension
  const allFilesRef = useRef(allFiles);
  const smartBlocksRef = useRef(smartBlocks);
  const ancestorsRef = useRef(ancestors);

  useEffect(() => {
    allFilesRef.current = allFiles;
    smartBlocksRef.current = smartBlocks;
    ancestorsRef.current = ancestors;
  }, [allFiles, smartBlocks, ancestors]);

  const handleMentionSearch = async (query: string) => {
    const files = allFilesRef.current;
    const blocks = smartBlocksRef.current;
    const currentAncestors = ancestorsRef.current;

    if (!files || !blocks || !currentAncestors) return [];
    
    return getMentionSuggestions(query, files, blocks, textFileId, currentAncestors, convex);
  }

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: { 
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      SmartBlock,
      SmartBlockContent,
      SmartBlockGroup,
      SmartBlockMention,
      GlobalBlockAttributes,

      BlockMention.configure({
        onSearch: handleMentionSearch
      }),
      AIExtension,
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ...TableBlockExtensions,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  const fetchTextFileBlocks = useQuery(api.requirements.textFileBlocks.getBlocksByFileId,{textFileId})
  const bulkCreateBlocks = useMutation(api.requirements.textFileBlocks.bulkCreate)
  const bulkUpdateBlocks = useMutation(api.requirements.textFileBlocks.bulkUpdate)
  const bulkDeleteBlocks = useMutation(api.requirements.textFileBlocks.bulkDelete)

  const isInitialLoaded = useRef(false);
  const lastSyncedContent = useRef<string>("");

  // Reset when textFileId changes so content reloads for the new file
  useEffect(() => {
    isInitialLoaded.current = false;
    lastSyncedContent.current = "";
    // Reset both scrollable containers
    document.getElementById("editor-scroll-container")?.scrollTo(0, 0);
    document.querySelector(".simple-editor-content")?.scrollTo(0, 0);
  }, [textFileId]);

  useEffect(()=>{
    if(editor &&fetchTextFileBlocks && !isInitialLoaded.current){
      isInitialLoaded.current = true;
      const document = parseBlocksToTiptapDocument(fetchTextFileBlocks)
      queueMicrotask(() => {
        editor.commands.setContent(document)
        editor.commands.setTextSelection({from:0,to:0})
      })
    }
  },[editor, fetchTextFileBlocks, textFileId])

  // Debounced sync on editor updates
  useEffect(() => {
    if (!editor || !fetchTextFileBlocks) return;

    const performSync = () => {
      const currentContent = JSON.stringify(editor.getJSON());
      
      // Only sync if content actually changed
      if (currentContent === lastSyncedContent.current) {
        return;
      }
      
      console.log("syncing");
      lastSyncedContent.current = currentContent;
      
      const blockData: BlockData[] = fetchTextFileBlocks.map((block) => {
        return {
          id: block.externalId,
          textFileId: block.textFileId,
          content: block.content,
          props: block.props,
          type: block.type,
          rank: block.rank,
          parentId: block.parentId,
        };
      });

      const { toCreate, toDelete, toUpdate } = syncEditorToDatabase(
        editor.getJSON(),
        blockData,
        textFileId
      );

      if (toCreate.length > 0) {
        const finalBlocks = toCreate.map((block) => {
          const { id, textFileId, ...rest } = block;
          return {
            ...rest,
            externalId: id,
          };
        });
        bulkCreateBlocks({
          blocks: finalBlocks,
          textFileId,
        });
      }

      if (toUpdate.length > 0) {
        const finalBlocks = toUpdate.map((block) => {
          const { id, textFileId, ...rest } = block;
          console.log("update block",block)
          return {
            ...rest,
            externalId: id,
            parentId:block.parentId,
          };
        });
        bulkUpdateBlocks({
          blocks: finalBlocks,
          textFileId,
        });
      }

      if (toDelete.length > 0) {
        bulkDeleteBlocks({
          externalIds: toDelete,
        });
      }
    };

    // Create debounced version (1 second delay after user stops typing)
    const debouncedSync = debounce(performSync, 1000);

    // Listen to editor updates
    editor.on('update', debouncedSync);

    // Cleanup
    return () => {
      editor.off('update', debouncedSync);
      debouncedSync.cancel(); 
    };
  }, [editor, fetchTextFileBlocks, bulkCreateBlocks, bulkUpdateBlocks, bulkDeleteBlocks]);


  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  // Register editor in the global store so the page-level chat can use it
  useEffect(() => {
    if (editor) {
      setEditor(editor)
    }
    return () => {
      setEditor(null)
    }
  }, [editor, setEditor])
  
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <div className="simple-editor-wrapper h-screen overflow-y-hidden">
        <EditorContext.Provider value={{ editor }}>
          <div className="simple-editor-floating-toolbar">
            <Toolbar
              ref={toolbarRef}
              variant="floating"
              style={{
                ...(isMobile
                  ? {
                      bottom: `calc(100% - ${height - rect.y}px)`,
                    }
                  : {}),
              }}
            >
              {mobileView === "main" ? (
                <MainToolbarContent
                  onHighlighterClick={() => setMobileView("highlighter")}
                  onLinkClick={() => setMobileView("link")}
                  isMobile={isMobile}
                />
              ) : (
                <MobileToolbarContent
                  type={mobileView === "highlighter" ? "highlighter" : "link"}
                  onBack={() => setMobileView("main")}
                />
              )}
            </Toolbar>
          </div>
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content hide-scrollbar"
          />
          {editor && <TableToolbar editor={editor} />}
        </EditorContext.Provider>
      </div>
    </Suspense>
  )
}
