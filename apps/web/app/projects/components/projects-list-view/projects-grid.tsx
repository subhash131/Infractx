"use client";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { ProjectDisplayCard } from "./project-display-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";

dayjs.extend(relativeTime);

export const ProjectsGrid = () => {
  const projects = useQuery(api.projects.getProjectsByOrganization, {
    organization: "org_123",
  });
  return (
    <div className="size-full overflow-x-hidden overflow-y-scroll hide-scrollbar">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-4">
        {projects?.map(({ name, updatedAt, description, _id }) => (
          <Link key={_id} href={`project/${_id}`}>
            <ProjectDisplayCard
              name={name}
              description={description}
              updatedAt={dayjs(updatedAt).fromNow()}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
