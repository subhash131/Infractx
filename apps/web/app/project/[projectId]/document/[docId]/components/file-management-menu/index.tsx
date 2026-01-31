import React from "react";
import { FilesList } from "./files-list";
import { Id } from "@workspace/backend/_generated/dataModel";

export const FileManagementMenu = ({docId,projectId}: {docId: Id<"documents">,projectId:Id<"projects">}) => {
  return (
    <div className="w-64 text-xs h-full border-r bg-[#1f1f1f] text-white">
      <FilesList docId={docId} projectId={projectId} />
    </div>
  );
};
