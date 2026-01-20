"use client";
import React from "react";
import { cn } from "@workspace/ui/lib/utils";

import { CanvasStage } from "./(components)/canvas-stage";
import { ToolBar } from "./(components)/toolbar";
import useCanvas from "./(components)/store";

const App: React.FC = () => {
  const { activeTool } = useCanvas();

  return (
    <div
      className={cn(
        "overflow-hidden h-screen w-screen",
        activeTool !== "SELECT" && "cursor-crosshair",
      )}
    >
      <ToolBar />
      <CanvasStage />
    </div>
  );
};

export default App;
