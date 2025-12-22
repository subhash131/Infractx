import React from "react";
import { RectangleTool } from "./rectangle-tool";
import { CircleTool } from "./circle-tool";
import { LineTool } from "./line-tool";
import { PencilTool } from "./pencil-tool";
import { TextTool } from "./text-tool";

export const DesignElementsBar = () => {
  return (
    <div className="w-44 h-full border bg-sidebar absolute left-0 z-99 ">
      <RectangleTool />
      <CircleTool />
      <LineTool />
      <PencilTool />
      <TextTool />
    </div>
  );
};
