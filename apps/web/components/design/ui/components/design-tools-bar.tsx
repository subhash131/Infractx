import React from "react";
import { RectangleTool } from "./design-tools/rectangle";
import { CircleTool } from "./design-tools/circle";
import { LineTool } from "./design-tools/line";
import { PencilTool } from "./design-tools/pencil";
import { TextTool } from "./design-tools/text";

export const DesignToolsBar = () => {
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
