import React from "react";
import { FilesList } from "./files-list";
import { FileManagementHeader } from "./file-management-header";

export const FileManagementMenu = () => {
  return (
    <div className="w-44 text-xs p-1 h-full border-r bg-[#1f1f1f] text-white">
      <FileManagementHeader />
      <FilesList />
    </div>
  );
};
