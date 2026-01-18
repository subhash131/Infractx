import { RequirementsDraftingView } from "@/modules/requirements/ui/views/requirements-drafting-view";
import React from "react";

type PageProps = {
  params: Promise<{
    requirementId: string;
  }>;
};

const RequirementsDraftingPage = async ({ params }: PageProps) => {
  const requirementId = (await params).requirementId;
  return <RequirementsDraftingView requirementId={requirementId}/>;
};

export default RequirementsDraftingPage;
