"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryState } from "nuqs";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";
import { NoFileSelected } from "./components/file-management-menu/no-file-selected";
import { ChatWindow } from "./components/tiptap-editor/extensions/ai-extension/chat/chat-window";
import { TOGGLE_POPUP, useChatStore } from "./components/tiptap-editor/store/chat-store";
import { v4 as uuid } from "uuid";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui/components/resizable";

const TiptapEditor = dynamic(
  () => import("./components/tiptap-editor/editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();
  const docId = params?.docId as Id<"documents">;
  const [fileId, setFileId] = useQueryState("fileId");

  const { showAIPopup, setShowAIPopup, setSelectedContext, editor } = useChatStore();

  useEffect(() => {
    if (!fileId && docId) {
      const savedState = localStorage.getItem(`tree-state-${docId}`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.selectedItems && parsedState.selectedItems.length > 0) {
            const firstItem = parsedState.selectedItems[0];
            if (firstItem && firstItem !== "root") {
              setFileId(firstItem);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved tree state:", e);
        }
      }
    }
  }, [docId, fileId, setFileId]);

  // Global Shift+Tab and toggle-ai-chat listener
  useEffect(() => {
    const handleToggleAIInput = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { from, to, togglePopup } = customEvent.detail;

      if (togglePopup) {
        setShowAIPopup(TOGGLE_POPUP);
      } else {
        setShowAIPopup(true);
      }

      if (editor && from !== undefined && to !== undefined) {
        const selectedText = editor.state?.doc?.textBetween(from, to);
        if (selectedText?.trim()) {
          setSelectedContext({
            text: selectedText,
            from,
            to,
            id: uuid(),
          });
        }
        editor.commands.setTextSelection({ from: 0, to: 0 });
      }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();
        setShowAIPopup(true);
        setTimeout(() => {
          document.getElementById("ai-chat-textarea")?.focus();
        }, 0);
      }
    };

    window.addEventListener("toggle-ai-chat", handleToggleAIInput);
    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("toggle-ai-chat", handleToggleAIInput);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [editor, setShowAIPopup, setSelectedContext]);

  const handleClosePopup = () => {
    setShowAIPopup(false);
  };

  const [layout, setLayout] = useState<number[] | null>(null);

  useEffect(() => {
    if (docId) {
      const savedLayout = localStorage.getItem(`sidebar-layout-${docId}`);
      if (savedLayout) {
        try {
          setLayout(JSON.parse(savedLayout));
        } catch (e) {
          setLayout([20, 80]);
        }
      } else {
        setLayout([20, 80]);
      }
    }
  }, [docId]);

  if (!layout) {
    return null; // Wait for layout to load from local storage
  }

  const effectiveFileId = fileId && fileId !== "root" ? fileId : null;

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="w-full h-full overflow-hidden hide-scrollbar flex bg-[#1F1F1F]"
      onLayout={(sizes) => {
        localStorage.setItem(`sidebar-layout-${docId}`, JSON.stringify(sizes));
      }}
    >
      <ResizablePanel defaultSize={layout[0]} minSize={15} maxSize={40} className="h-full border-r">
        <FileManagementMenu docId={docId} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={layout[1]} className="h-full flex flex-col">
        {effectiveFileId && <div id="editor-scroll-container" className="w-full h-full overflow-hidden overflow-y-auto hide-scrollbar">
          <DocHeader />
          <TiptapEditor textFileId={effectiveFileId as Id<"text_files">} />
        </div>}
        {!effectiveFileId && <NoFileSelected docId={docId} />}
      </ResizablePanel>
      {showAIPopup && (
        <ChatWindow
          editor={editor}
          onClose={handleClosePopup}
        />
      )}
    </ResizablePanelGroup>
  );
};

export default RequirementsDraftingPage;
