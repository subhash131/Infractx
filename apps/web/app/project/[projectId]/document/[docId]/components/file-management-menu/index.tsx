import React from "react";
import { FilesList } from "./files-list";
import { FileManagementHeader } from "./file-management-header";
import { Id } from "@workspace/backend/_generated/dataModel";

export const FileManagementMenu = ({docId,projectId}: {docId: Id<"documents">,projectId:Id<"projects">}) => {
  return (
    <div className="w-44 text-xs p-1 h-full border-r bg-[#1f1f1f] text-white">
      <FileManagementHeader docId={docId} projectId={projectId} />
      <FilesList docId={docId} />
    </div>
  );
};
