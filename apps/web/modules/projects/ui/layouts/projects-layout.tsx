import React from "react";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";
import ProjectsSidebar from "../components/projects-sidebar";
import { AuthenticatedProvider } from "@/modules/providers";

const ProjectLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  return (
    <AuthenticatedProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <ProjectsSidebar />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarProvider>
    </AuthenticatedProvider>
  );
};

export default ProjectLayout;
