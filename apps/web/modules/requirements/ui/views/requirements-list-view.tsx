import { Button } from "@workspace/ui/components/button";
import React from "react";
import { CreateRequirementDialog } from "../components/create-requirement-dialog";

export const RequirementsListView = () => {
  return (
    <div className="w-full min-h-screen flex flex-col px-10 pt-2">
      <div className="w-full h-12 flex justify-between">
        <h3 className="scroll-m-20 text-lg font-semibold tracking-tight">
          Requirements
        </h3>
        <CreateRequirementDialog />
      </div>
    </div>
  );
};
