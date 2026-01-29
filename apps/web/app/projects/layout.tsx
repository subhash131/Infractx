import ProjectLayout from "@/modules/projects/ui/layouts/projects-layout";
import { Toaster } from "sonner";

import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProjectLayout>
      <Toaster />
      {children}
    </ProjectLayout>
  );
};

export default Layout;
