import React from "react";
import { CreateProjectDialog } from "./create-project-dialog";

export const ProjectListHeader = () => {
  return (
    <div className="w-full flex items-center justify-between sticky top-0 bg-[#1f1f1f] px-10 py-4 z-50 border-b">
      <h1>My Projects</h1>
      <CreateProjectDialog />
    </div>
  );
};
