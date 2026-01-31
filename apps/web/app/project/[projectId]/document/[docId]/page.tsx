"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { DocHeader } from "./components/doc-header";
import { FileManagementMenu } from "./components/file-management-menu";
import { Id } from "@workspace/backend/_generated/dataModel";

const CollaborativeEditor = dynamic(
  () => import("./components/collaborative-editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();

  const docId = params?.docId as Id<"documents">;
  const projectId = params?.projectId as Id<"projects">;

  return (
    <div className="w-screen h-screen overflow-hidden hide-scrollbar flex">
      <FileManagementMenu docId={docId} projectId={projectId} />
      <div className="w-full h-screen overflow-hidden overflow-y-scroll hide-scrollbar">
        <DocHeader />
        <CollaborativeEditor />
      </div>
    </div>
  );
};

export default RequirementsDraftingPage;
