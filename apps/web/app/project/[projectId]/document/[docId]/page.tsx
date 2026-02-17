"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";
import { NoFileSelected } from "./components/file-management-menu/no-file-selected";
import { ChatWindow } from "./components/tiptap-editor/extensions/ai-extension/chat/chat-window";
import { TOGGLE_POPUP, useChatStore } from "./components/tiptap-editor/store/chat-store";
import { v4 as uuid } from "uuid";

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
            setFileId(parsedState.selectedItems[0]);
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

  return (
    <div className="w-full h-full overflow-hidden hide-scrollbar flex bg-[#1F1F1F]">
      <FileManagementMenu docId={docId} />
      {fileId && <div id="editor-scroll-container" className="w-full h-full overflow-hidden overflow-y-auto hide-scrollbar">
        <DocHeader />
        <TiptapEditor textFileId={fileId as Id<"text_files">} />
      </div>}
      {!fileId && <NoFileSelected docId={docId} />}
      {showAIPopup && (
        <ChatWindow
          editor={editor}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default RequirementsDraftingPage;
