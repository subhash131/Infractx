"use client";
import React from "react";
import { Button } from "@workspace/ui/components/button";
import { FolderOpen, MessageCircle, PlusIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useQueryState } from "nuqs";

export const NoFileSelected = ({
  docId,
}: {
  docId: Id<"documents">;
}) => {
  const createFile = useMutation(api.requirements.textFiles.create);
  const [_, setSelectedFileId] = useQueryState("fileId");

  const handleCreateFile = async () => {
    const newFileId = await createFile({
      title: "Untitled",
      documentId: docId,
      type: "FILE",
    });
    if (newFileId) {
      setSelectedFileId(newFileId);
    }
  };

  const handleCreateFolder = async () => {
    const newFolderId = await createFile({
      title: "New_Folder",
      documentId: docId,
      type: "FOLDER",
    });
    if (newFolderId) {
      setSelectedFileId(newFolderId);
    }
  };

  const handleChatWithAI = () => {
    window.dispatchEvent(
      new CustomEvent("toggle-ai-chat", {
        detail: { togglePopup: true },
      })
    );
  };

  return (
    <div className="w-full h-screen overflow-hidden hide-scrollbar p-4 min-h-screen max-h-screen">
      <div className="size-full flex pt-40 justify-center gap-4">
        <Button className="p-2" variant={"outline"} onClick={handleCreateFile}>
          <PlusIcon />
          New File
        </Button>
        <Button
          className="p-2"
          variant={"outline"}
          onClick={handleCreateFolder}
        >
          <FolderOpen />
          New Folder
        </Button>
        <Button
          className="p-2"
          variant={"outline"}
          onClick={handleChatWithAI}
        >
          <MessageCircle />
          Chat with AI <span className="text-[10px] text-gray-400 ml-1">shift + tab</span>
        </Button>
      </div>
    </div>
  );
};
