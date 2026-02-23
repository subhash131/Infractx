"use client";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { ProjectDisplayCard } from "./project-display-card";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ActionMenu, ActionMenuItem } from "@workspace/ui/components/action-menu";
import { Copy, FolderOpen, Trash2 } from "lucide-react";

import { Doc } from "@workspace/backend/_generated/dataModel";

dayjs.extend(relativeTime);

const ProjectListItem = ({ project }: { project: Doc<"projects"> }) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Open",
      icon: <FolderOpen size={14} />,
      onClick: () => {
        window.location.href = `/project/${project._id}`;
      },
    },
    {
      label: "Duplicate",
      icon: <Copy size={14} />,
      onClick: () => {
        console.log("Duplicate Project:", project.name);
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={14} />,
      variant: "destructive",
      onClick: () => {
        console.log("Delete Project:", project.name);
      },
    },
  ];

  return (
    <ActionMenu
      items={menuItems}
      contentClassName="w-48"
    >
      <div data-project-id={project._id}>
        <Link href={`/project/${project._id}`}>
          <ProjectDisplayCard
            name={project.name}
            updatedAt={
              dayjs(project.updatedAt).fromNow() === "a few seconds ago"
                ? "Just now"
                : dayjs(project.updatedAt).fromNow()
            }
            description={project.description}
          />
        </Link>
      </div>
    </ActionMenu>
  );
};

export const ProjectsGrid = () => {
  const projects = useQuery(api.projects.getProjectsByOrganization);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 w-full">
      {projects?.map((project) => (
        <ProjectListItem key={project._id} project={project} />
      ))}
    </div>
  );
};
