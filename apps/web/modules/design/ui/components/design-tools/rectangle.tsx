  "use client";
  import React from "react";
  import * as fabric from "fabric";
  import { RectangleHorizontal } from "lucide-react";
  import { Button } from "@workspace/ui/components/button";
  import useCanvas from "../../../store";
  import { Id } from "@workspace/backend/_generated/dataModel";
  import { TOOLS } from "../../constants";
  import { v4 as uuidv4 } from "uuid";
  import { useUpsertCanvasObject } from "../../hooks/use-upsert-canvas-object";

  export const RectangleTool = ({ canvasId }: { canvasId: string }) => {
    const { canvas } = useCanvas();

    const upsert = useUpsertCanvasObject();

    const handleAddRectangle = () => {
      if (!canvas) return;

      const rect = new fabric.Rect({
        width: 1200,
        height: 800,
        fill: "#D9D9D9",
        strokeWidth: 1,
        strokeUniform: true,
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
      rect.set({
        left: centerX - rect.width / 2 + canvas._objects.length * 10,
        top: centerY - rect.height / 2 + canvas._objects.length * 10,
      });

      upsert({
        canvasId: canvasId as Id<"canvases">,
        type: TOOLS.RECT,
        height: rect.height,
        left: rect.left,
        objectId: uuidv4(),
        top: rect.top,
        width: rect.width,
        angle: rect.angle,
        fill: rect.fill ? rect.fill.toString() : undefined,
        opacity: rect.opacity,
        rx: rect.rx,
        ry: rect.ry,
        shadow: rect.shadow ? rect.shadow.toString() : undefined,
        stroke: rect.stroke ? rect.stroke.toString() : undefined,
        strokeWidth: rect.strokeWidth,
        scaleX: rect.scaleX,
        scaleY: rect.scaleY,
        cornerColor: rect.cornerColor,
        cornerSize: rect.cornerSize,
        cornerStrokeColor: rect.cornerStrokeColor,
        borderColor: rect.borderColor,
        borderScaleFactor: rect.borderScaleFactor,
        strokeUniform: rect.strokeUniform,
      });
    };

    return (
      <Button
        onClick={handleAddRectangle}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RectangleHorizontal className="h-4 w-4" />
        Rectangle
      </Button>
    );
  };
