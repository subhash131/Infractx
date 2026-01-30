"use client"
import React from "react";
import { DocumentDisplayCard } from "./document-display-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ProjectHeader } from "./project-header";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import Link from "next/link";

dayjs.extend(relativeTime);

export const ListDocumentsView = ({projectId}: {projectId: Id<"projects">}) => {
  const project = useQuery(api.projects.getProjectById,{projectId})
  const truncate = (text = "", limit: number) =>
  text.length > limit ? `${text.slice(0, limit)}...` : text;

  const route = (type:Doc<"documents">["type"],id:Id<"documents">)=>{
    switch (type) {
      case "TEXT":
        return `/document/${id}`;
      case "CANVAS":
        return `/design/${id}`;
    }
  }

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden p-4">
    <ProjectHeader name={project?.name || ""} description={project?.description || ""} projectId={projectId}/>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,320px))] gap-4 p-4">
        {project?.documents?.map((document) => (
          <Link 
            href={route(document.type,document._id)}
            key={document._id}
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

        ))}    
      </div>
    </div>
  );
};
