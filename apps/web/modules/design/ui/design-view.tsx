"use client";

import React from "react";
import { DesignCanvas } from "./components/design-canvas";
import { DesignToolsBar } from "./components/design-tools-bar";
import { EditSelectedItemBar } from "./components/edit-selected-item-bar";

export const DesignView = ({ canvasId }: { canvasId: string }) => {
  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center relative">
      <DesignCanvas canvasId={canvasId} />
      <DesignToolsBar canvasId={canvasId} />
      <EditSelectedItemBar />
    </div>
  );
};
