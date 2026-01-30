import React from "react";
import { ListDocumentsView } from "./components/list-documents-view";
import { Id } from "@workspace/backend/_generated/dataModel";

const ProjectSelectedPage =async ({params}:{params:Promise<{projectId:string}>}) => {
  const projectId = (await params).projectId as Id<"projects">;
  return <ListDocumentsView projectId={projectId} />;
};

export default ProjectSelectedPage;
