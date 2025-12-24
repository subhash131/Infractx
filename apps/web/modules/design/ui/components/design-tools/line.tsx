"use client";
import React from "react";
import * as fabric from "fabric";
import { Minus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { TOOLS } from "../../constants";
import { v4 as uuidv4 } from "uuid";
import { useUpsertCanvasObject } from "../../hooks/use-upsert-canvas-object";

export const LineTool = ({ canvasId }: { canvasId: string }) => {
  const { canvas } = useCanvas();

  const upsert = useUpsertCanvasObject();

  const handleAddLine = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const line = new fabric.Polyline(
      [
        { x: 50, y: 50 },
        { x: 150, y: 150 },
      ],
      {
        stroke: "#000000",
        strokeWidth: 1,
        strokeUniform: true,
        fill: "",
        cornerColor: "#4096ee",
        cornerSize: 8,
        cornerStrokeColor: "#4096ee",
        borderColor: "#4096ee",
        borderScaleFactor: 1,
        angle: 45,
      }
    );

    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    const centerX = (canvas.width / 2 - vpt[4]) / zoom;
    const centerY = (canvas.height / 2 - vpt[5]) / zoom;
    line.set({
      left: centerX + canvas._objects.length * 10,
      top: centerY - line.height / 2 + canvas._objects.length * 10,
    });

    upsert({
      canvasId: canvasId as Id<"canvases">,
      type: TOOLS.LINE, // or TOOLS.POLYLINE depending on your constants
      height: line.height,
      left: line.left,
      objectId: uuidv4(),
      top: line.top,
      width: line.width,
      angle: line.angle,
      fill: line.fill ? line.fill.toString() : "#000000",
      opacity: line.opacity,
      shadow: line.shadow ? line.shadow.toString() : undefined,
      stroke: line.stroke ? line.stroke.toString() : undefined,
      strokeWidth: line.strokeWidth,
      scaleX: line.scaleX,
      scaleY: line.scaleY,
      cornerColor: line.cornerColor,
      cornerSize: line.cornerSize,
      cornerStrokeColor: line.cornerStrokeColor,
      borderColor: line.borderColor,
      borderScaleFactor: line.borderScaleFactor,
      strokeUniform: line.strokeUniform,
      points: line.points, // Polyline-specific property
    });
  };

  return (
    <Button
      onClick={handleAddLine}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Minus className="h-4 w-4" />
      Line
    </Button>
  );
};
