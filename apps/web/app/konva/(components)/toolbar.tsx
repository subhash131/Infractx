import React from "react";
import { AiChat02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import { Circle, RectangleHorizontal, Square } from "lucide-react";
import useCanvas from "./store";

export const ToolBar = () => {
  const { setActiveTool, activeTool } = useCanvas();
  return (
    <div className="w-full m-auto absolute bottom-10  z-99">
      <div className="w-fit mx-auto border bg-white flex gap-2 p-2.5 rounded-full">
        <div className="size-full flex gap-2 items-center">
          <Button
            onClick={() => setActiveTool("FRAME")}
            variant={activeTool === "FRAME" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Frame
          </Button>
          <Button
            onClick={() => setActiveTool("RECT")}
            variant={activeTool === "RECT" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <RectangleHorizontal className="h-4 w-4" />
            Rect
          </Button>
          <Button
            onClick={() => setActiveTool("CIRCLE")}
            variant={activeTool === "CIRCLE" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Circle className="h-4 w-4" />
            Circle
          </Button>
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
    </div>
  );
};
