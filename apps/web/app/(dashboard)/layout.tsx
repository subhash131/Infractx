import DashboardLayout from "@/modules/dashboard/ui/layouts/dashboard-layout";
import { Toaster } from "sonner";

import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DashboardLayout>
      <Toaster />
      {children}
    </DashboardLayout>
  );
};

export default Layout;
