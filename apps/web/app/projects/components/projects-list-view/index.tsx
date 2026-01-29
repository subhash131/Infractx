import React from "react";
import { ProjectListHeader } from "./project-list-header";
import { ProjectsGrid } from "./projects-grid";

export const ProjectsListView = () => {
  return (
    <div className="w-full bg-[#1f1f1f] hide-scrollbar flex flex-col relative">
      <ProjectListHeader />
      <ProjectsGrid />
    </div>
  );
};
