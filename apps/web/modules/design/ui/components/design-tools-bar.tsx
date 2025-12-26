import React from "react";
import { RectangleTool } from "./design-tools/rectangle";
import { CircleTool } from "./design-tools/circle";
import { LineTool } from "./design-tools/line";
import { PencilTool } from "./design-tools/pencil";
import { TextTool } from "./design-tools/text";
import { AiChat02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import { FrameTool } from "./design-tools/frame";

export const DesignToolsBar = () => {
  return (
    <div className="w-fit mx-auto border bg-sidebar absolute bottom-10 z-99 flex gap-2 p-2.5 rounded-full">
      <div className="size-full flex gap-2 items-center">
        <FrameTool />
        <RectangleTool />
        <CircleTool />
        <LineTool />
        <TextTool />
        <PencilTool />
      </div>

      <Button
        onClick={() => {}}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 rounded-r-3xl rounded-l-md"
      >
        <HugeiconsIcon icon={AiChat02Icon} className="size-4" />
        Assist
      </Button>
    </div>
  );
};
