"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const CollaborativeEditor = dynamic(
  () => import("./components/collabrative-editor"),
  { ssr: false },
);

const RequirementsDraftingPage = () => {
  const params = useParams();

  const requirementId = params?.requirementId as string;

  return (
    <div className="w-screen h-screen overflow-hidden hide-scrollbar flex">
      <div className="w-44 bg-sidebar text-xs p-1 h-full border-r">
        <h1 className="text-sm py-1 px-2 border-b ">Blocks</h1>
      </div>
      <div className="w-full h-screen overflow-hidden overflow-y-scroll hide-scrollbar">
        <CollaborativeEditor />
      </div>
    </div>
  );
};

export default RequirementsDraftingPage;
