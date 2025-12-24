"use client";
import React from "react";
import * as fabric from "fabric";
import { Type } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { TOOLS } from "../../constants";
import { v4 as uuidv4 } from "uuid";
import { useUpsertCanvasObject } from "../../hooks/use-upsert-canvas-object";

export const TextTool = ({ canvasId }: { canvasId: string }) => {
  const { canvas } = useCanvas();

  const upsert = useUpsertCanvasObject();

  const handleAddText = (e: React.MouseEvent) => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const text = new fabric.IText("Text", {
      left: innerWidth / 2 + canvas._objects.length * 10,
      top: innerHeight / 3 + canvas._objects.length * 10,
      fontSize: 20,
      fill: "#000000",
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
      padding: 8,
    });

    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    const centerX = (canvas.width / 2 - vpt[4]) / zoom;
    const centerY = (canvas.height / 2 - vpt[5]) / zoom;
    text.set({
      left: centerX - text.width / 2 + canvas._objects.length * 10,
      top: centerY - text.height / 2 + canvas._objects.length * 10,
    });

    upsert({
      canvasId: canvasId as Id<"canvases">,
      type: TOOLS.TEXT, // or TOOLS.ITEXT
      objectId: uuidv4(),
      // Position and dimensions
      left: text.left,
      top: text.top,
      width: text.width,
      height: text.height,
      angle: text.angle,
      scaleX: text.scaleX,
      scaleY: text.scaleY,
      // Text-specific properties
      text: text.text,
      fontSize: text.fontSize,
      fontFamily: text.fontFamily,
      fontWeight: text.fontWeight ? text.fontWeight.toString() : undefined,
      fontStyle: text.fontStyle,
      textAlign: text.textAlign,
      underline: text.underline,
      linethrough: text.linethrough,
      overline: text.overline,
      // Styling
      fill: text.fill ? text.fill.toString() : undefined,
      stroke: text.stroke ? text.stroke.toString() : undefined,
      strokeWidth: text.strokeWidth,
      opacity: text.opacity,
      shadow: text.shadow ? text.shadow.toString() : undefined,
      // Control styling
      cornerColor: text.cornerColor,
      cornerSize: text.cornerSize,
      cornerStrokeColor: text.cornerStrokeColor,
      borderColor: text.borderColor,
      borderScaleFactor: text.borderScaleFactor,
      strokeUniform: text.strokeUniform,
      padding: text.padding,
    });
  };

  return (
    <Button
      onClick={handleAddText}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Type className="h-4 w-4" />
      Text
    </Button>
  );
};
