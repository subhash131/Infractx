import React from "react";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";
import DashboardSidebar from "../components/dashboard-sidebar";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <DashboardSidebar />
      <main className="flex flex-1 flex-col">{children}</main>
    </SidebarProvider>
  );
};

export default DashboardLayout;
