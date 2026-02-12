"use client";

import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";

const TiptapEditor = dynamic(
  () => import("./components/tiptap-editor/editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();
  const searchParams = useSearchParams()

  const docId = params?.docId as Id<"documents">;
  const fileId = searchParams?.get("fileId") as Id<"text_files">;

  return (
    <div className="w-screen h-screen overflow-hidden hide-scrollbar flex bg-[#1F1F1F]">
      <FileManagementMenu docId={docId} />
      <div className="w-full h-screen overflow-hidden overflow-y-scroll hide-scrollbar">
        <DocHeader />
        <TiptapEditor textFileId={fileId} />
      </div>
    </div>
  );
};

export default RequirementsDraftingPage;
