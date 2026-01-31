import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileAddIcon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { truncate } from "@/modules/utils";

export const FileManagementHeader = ({docId,projectId}: {docId: Id<"documents">,projectId:Id<"projects">}) => {
  const project = useQuery(api.projects.getProjectById, projectId?{projectId:projectId}:"skip")
  const createFile = useMutation(api.requirements.textFiles.create)

  const handleCreateFile = ({title,type}: {title:string,type:"FILE"|"FOLDER"}) => {
    createFile({title,type,documentId:docId})
  }

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-sm py-1 px-2 ">{truncate(project?.name,10)}</h1>
      <div className="flex items-center gap-1">
        <button className="p-1 hover:bg-white/10 rounded-md">
         <HugeiconsIcon icon={FileAddIcon} size={16} onClick={() => handleCreateFile({title:"New Document",type:"FILE"})}/>
        </button>
        <button className="p-1 hover:bg-white/10 rounded-md">
          <HugeiconsIcon icon={FolderAddIcon} size={16} onClick={() => handleCreateFile({title:"New Folder",type:"FOLDER"})}/>
        </button>
      </div>
    </div>
  );
};
