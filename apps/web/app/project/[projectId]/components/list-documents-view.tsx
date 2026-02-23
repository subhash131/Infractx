"use client"
import React from "react";
import { DocumentDisplayCard } from "./document-display-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ProjectHeader } from "./project-header";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { ActionMenu, ActionMenuItem } from "@workspace/ui/components/action-menu";
import { Copy, FolderOpen, Trash2 } from "lucide-react";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import Link from "next/link";
import { truncate } from "@/modules/utils";

dayjs.extend(relativeTime);

const DocumentListItem = ({ document, route }: { document: Doc<"documents">, route: (type: Doc<"documents">["type"], id: Id<"documents">) => string | undefined }) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Open",
      icon: <FolderOpen size={14} />,
      onClick: () => {
        window.location.href = route(document.type, document._id) || "";
      },
    },
    {
      label: "Duplicate",
      icon: <Copy size={14} />,
      onClick: () => {
        console.log("Duplicate Document:", document.title);
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={14} />,
      variant: "destructive",
      onClick: () => {
        console.log("Delete Document:", document.title);
      },
    },
  ];

  return (
    <ActionMenu
      items={menuItems}
      contentClassName="w-48"
    >
      <div>
        <Link 
          href={route(document.type, document._id) || ""}
        >
        <DocumentDisplayCard
          name={truncate(document.title, 25)}
          description={truncate(document.description, 35)}
          updatedAt={
            dayjs(document.updatedAt).fromNow() === "a few seconds ago"
              ? "Just now"
              : dayjs(document.updatedAt).fromNow()
          }
        />
        </Link>
      </div>
    </ActionMenu>
  );
};

export const ListDocumentsView = ({projectId}: {projectId: Id<"projects">}) => {
  const project = useQuery(api.projects.getProjectById,{projectId})
 

  const route = (type:Doc<"documents">["type"],id:Id<"documents">)=>{
    switch (type) {
      case "TEXT":
        return `${projectId}/document/${id}`;
      case "CANVAS":
        return `${projectId}/design/${id}`;
    }
  }

 
  return (
    <div className="flex flex-col gap-4 overflow-x-hidden p-4">
    <ProjectHeader name={project?.name || ""} description={project?.description || ""} projectId={projectId}/>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,320px))] gap-4 p-4">
        {project?.documents?.map((document) => (
          <DocumentListItem key={document._id} document={document} route={route} />
        ))}    
      </div>
    </div>
  );
};
