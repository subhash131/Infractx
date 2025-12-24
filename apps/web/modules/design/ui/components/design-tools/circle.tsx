import React from "react";
import * as fabric from "fabric";
import { Circle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { useUpsertCanvasObject } from "../../hooks/use-upsert-canvas-object";
import { TOOLS } from "../../constants";
import { Id } from "@workspace/backend/_generated/dataModel";
import { v4 as uuidv4 } from "uuid";

export const CircleTool = ({ canvasId }: { canvasId: string }) => {
  const { canvas } = useCanvas();
  const upsert = useUpsertCanvasObject();

  const handleAddCircle = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const radius = 50;
    const circle = new fabric.Circle({
      radius,
      stroke: "#010101",
      fill: "#D9D9D9",
      strokeWidth: 0.5,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1,
    });

    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    const centerX = (canvas.width / 2 - vpt[4]) / zoom;
    const centerY = (canvas.height / 2 - vpt[5]) / zoom;

    circle.set({
      left: centerX - radius + canvas._objects.length * 10,
      top: centerY - radius + canvas._objects.length * 10,
    });

    upsert({
      canvasId: canvasId as Id<"canvases">,
      type: TOOLS.CIRCLE,
      height: circle.height,
      left: circle.left,
      objectId: uuidv4(),
      top: circle.top,
      width: circle.width,
      angle: circle.angle,
      radius: circle.radius,
      fill: circle.fill ? circle.fill.toString() : undefined,
      opacity: circle.opacity,
      rx: circle.rx,
      ry: circle.ry,
      shadow: circle.shadow ? circle.shadow.toString() : undefined,
      stroke: circle.stroke ? circle.stroke.toString() : undefined,
      strokeWidth: circle.strokeWidth,
      scaleX: circle.scaleX,
      scaleY: circle.scaleY,
      cornerColor: circle.cornerColor,
      cornerSize: circle.cornerSize,
      cornerStrokeColor: circle.cornerStrokeColor,
      borderColor: circle.borderColor,
      borderScaleFactor: circle.borderScaleFactor,
      strokeUniform: circle.strokeUniform,
    });
  };

  return (
    <Button
      onClick={handleAddCircle}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Circle className="h-4 w-4" />
      Circle
    </Button>
  );
};
