import React from "react";
import { FilesList } from "./files-list";
import { Id } from "@workspace/backend/_generated/dataModel";

export const FileManagementMenu = ({docId}: {docId: Id<"documents">}) => {
  return (
    <div className="w-full text-xs h-full min-h-screen max-h-screen bg-[#1f1f1f] text-white overflow-scroll hide-scrollbar p-2">
      <FilesList docId={docId} />
    </div>
  );
};
