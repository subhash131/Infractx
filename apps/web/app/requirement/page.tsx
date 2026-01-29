"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Header } from "./components/header";
import { FileManagementMenu } from "./components/file-management-menu";

const CollaborativeEditor = dynamic(
  () => import("./components/collaborative-editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();

  const requirementId = params?.requirementId as string;

  return (
    <div className="w-screen h-screen overflow-hidden hide-scrollbar flex">
      <FileManagementMenu />
      <div className="w-full h-screen overflow-hidden overflow-y-scroll hide-scrollbar">
        <Header />
        <CollaborativeEditor />
      </div>
    </div>
  );
};

export default RequirementsDraftingPage;
