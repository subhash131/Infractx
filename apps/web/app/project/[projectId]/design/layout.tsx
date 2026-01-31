import { AuthenticatedProvider } from "@/modules/providers";
import React from "react";

const DesignLayout = ({ children }: { children: React.ReactNode }) => {
  return <AuthenticatedProvider>{children}</AuthenticatedProvider>;
};

export default DesignLayout;    
