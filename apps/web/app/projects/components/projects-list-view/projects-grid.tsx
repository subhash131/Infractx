"use client";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { ProjectDisplayCard } from "./project-display-card";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const ProjectsGrid = () => {
  const projects = useQuery(api.projects.getProjectsByOrganization, {
    organization: "org_123",
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 w-full">
      {projects?.map(({ name, updatedAt, description, _id }) => (
        <Link key={_id} href={`/project/${_id}`}>
          <ProjectDisplayCard
            name={name}
            updatedAt={
              dayjs(updatedAt).fromNow() === "a few seconds ago"
                ? "Just now"
                : dayjs(updatedAt).fromNow()
            }
            description={description}
          />
        </Link>
      ))}
    </div>
  );
};
