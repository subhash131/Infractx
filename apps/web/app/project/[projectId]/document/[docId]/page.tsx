"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";
import { NoFileSelected } from "./components/file-management-menu/no-file-selected";

const TiptapEditor = dynamic(
  () => import("./components/tiptap-editor/editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();
  const docId = params?.docId as Id<"documents">;
  const [fileId, setFileId] = useQueryState("fileId");

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

  return (
    <div className="w-full h-full overflow-hidden hide-scrollbar flex bg-[#1F1F1F]">
      <FileManagementMenu docId={docId} />
      {fileId && <div id="editor-scroll-container" className="w-full h-full overflow-hidden overflow-y-auto hide-scrollbar">
        <DocHeader />
        <TiptapEditor textFileId={fileId as Id<"text_files">} />
      </div>}
      {!fileId && <NoFileSelected docId={docId} />}
    </div>
  );
};

export default RequirementsDraftingPage;
