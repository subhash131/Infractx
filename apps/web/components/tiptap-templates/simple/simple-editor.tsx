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

// --- UI Primitives ---
import {  Toolbar } from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Hooks ---
import { useIsBreakpoint } from "@/app/hooks/use-is-breakpoint"
import { useWindowSize } from "@/app/hooks/use-window-size"
import { useCursorVisibility } from "@/app/hooks/use-cursor-visibility"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/app/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

import { syncEditorToDatabase } from "@/app/tiptap/components/utils/sync-editor-to-database"
import { Id } from "@workspace/backend/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { MobileToolbarContent } from "./mobile-toolbar-content"
import { MainToolbarContent } from "./main-toolbar-content"
import { parseBlocksToTiptapDocument } from "@/app/tiptap/components/utils/parse-blocks-to-tiptap-doc"
import { debounce } from "lodash"

// --- Custom extensions ---
import content from "@/components/tiptap-templates/simple/data/content.json"
import { SmartBlock } from "@/app/tiptap/components/extensions/smart-block"
import { SmartBlockContent } from "@/app/tiptap/components/extensions/smart-block/smart-block-content"
import { SmartBlockGroup } from "@/app/tiptap/components/extensions/smart-block/smart-block-group"
import { GlobalBlockAttributes } from "@/app/tiptap/components/extensions/smart-block/global-block-attributes"
import { BlockData } from "@/app/tiptap/components/extensions/types"
import { BlockMention } from "@/app/tiptap/components/extensions/block-suggestions/block-mention"
import { AIExtension } from "@/app/tiptap/components/extensions/ai-extension"
import "@/app/tiptap/components/extensions/ai-extension/ai-extension.scss"
import { AIInputPopup } from "@/app/tiptap/components/extensions/ai-extension/ai-input-popup"


export function SimpleEditor() {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)

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
      GlobalBlockAttributes,
      BlockMention,
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
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  const textFileId = "ns75m5g7e1h4z9dj5vb7y1ydsx80asp4" as Id<"text_files">
  const fetchTextFileBlocks = useQuery(api.requirements.textFileBlocks.getBlocksByFileId,{textFileId})
  const bulkCreateBlocks = useMutation(api.requirements.textFileBlocks.bulkCreate)
  const bulkUpdateBlocks = useMutation(api.requirements.textFileBlocks.bulkUpdate)
  const bulkDeleteBlocks = useMutation(api.requirements.textFileBlocks.bulkDelete)

  const isInitialLoaded = useRef(false);
  const lastSyncedContent = useRef<string>("");

  useEffect(()=>{
    if(editor &&fetchTextFileBlocks && !isInitialLoaded.current){
      console.log({fetchTextFileBlocks})
      const document = parseBlocksToTiptapDocument(fetchTextFileBlocks)
      console.log({document})
      editor.commands.setContent(document)
      editor.commands.setTextSelection({from:0,to:0})
      isInitialLoaded.current = true;
    }
  },[editor, fetchTextFileBlocks])

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
        "ns75m5g7e1h4z9dj5vb7y1ydsx80asp4" as Id<"text_files">
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
          textFileId: "ns75m5g7e1h4z9dj5vb7y1ydsx80asp4" as Id<"text_files">
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
          textFileId: "ns75m5g7e1h4z9dj5vb7y1ydsx80asp4" as Id<"text_files">
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
      debouncedSync.cancel(); // Cancel any pending debounced calls
    };
  }, [editor, fetchTextFileBlocks, bulkCreateBlocks, bulkUpdateBlocks, bulkDeleteBlocks]);


  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  const [showAIPopup, setShowAIPopup] = useState(false)
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)


  useEffect(() => {
    const handleShowAIInput = (event: Event) => {
      const customEvent = event as CustomEvent
      const { from, to } = customEvent.detail
      
      console.log('Received show-ai-input event:', { from, to })
      
      setSelectionRange({ from, to })
      setShowAIPopup(true)
    }

    window.addEventListener('show-ai-input', handleShowAIInput)

    return () => {
      window.removeEventListener('show-ai-input', handleShowAIInput)
    }
  }, [])

  const handleAISubmit = async (prompt: string, selectedText: string) => {
    console.log('AI Submit:', { prompt, selectedText })
    
    // Here you would call your AI API
    // For now, just log the values
    
    // Example of how you might replace the selected text:
    if (editor && selectionRange) {
      // You can insert AI response here
      // editor.chain().focus().insertContentAt(selectionRange, 'AI response here').run()
    }
  }

  const handleClosePopup = () => {
    setShowAIPopup(false)
    setSelectionRange(null)
  }
  
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <div className="simple-editor-wrapper">
        <EditorContext.Provider value={{ editor }}>
          <Toolbar
            ref={toolbarRef}
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

          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
            
          />
          {showAIPopup && selectionRange && (
            <AIInputPopup
              from={selectionRange.from}
              to={selectionRange.to}
              onClose={handleClosePopup}
              onSubmit={handleAISubmit}
            />
          )}
        </EditorContext.Provider>
      </div>
    </Suspense>
  )
}
