import React from "react";
import { RequirementEditor } from "../components/requirement-editor";

export const RequirementsDraftingView = ({
  requirementId,
}: {
  requirementId: string;
}) => {
  return (
    <div>
      <RequirementEditor />
    </div>
  );
};
