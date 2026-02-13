"use client";

import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { FolderOpen, MessageCircle, PlusIcon } from "lucide-react";

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
    <div className="w-full h-full overflow-hidden hide-scrollbar flex bg-[#1F1F1F]">
      <FileManagementMenu docId={docId} />
      {fileId && <div className="w-full h-full overflow-hidden overflow-y-auto hide-scrollbar">
        <DocHeader />
        <TiptapEditor textFileId={fileId} />
      </div>}
      {!fileId && <div className="w-full h-screen overflow-hidden hide-scrollbar p-4 min-h-screen max-h-screen">
        <div>
          <h1 className="text-2xl font-bold">InfraBro</h1>
          <p className="text-gray-400">Draft your technical design</p>
        </div>
        <div className="size-full flex pt-40 justify-center gap-4">
          <Button className="p-2" variant={"outline"}>
            <PlusIcon />
            New File
          </Button>
          <Button className="p-2" variant={"outline"}>
            <MessageCircle />
            Chat with AI
          </Button>
          <Button className="p-2" variant={"outline"}>
            <FolderOpen />
            Open File
          </Button>
        </div>
      </div>}
    </div>
  );
};

export default RequirementsDraftingPage;
