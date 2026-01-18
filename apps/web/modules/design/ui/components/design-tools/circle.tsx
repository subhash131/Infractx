import React from "react";
import * as fabric from "fabric";
import { Circle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export const CircleTool = () => {
  const { canvas, activeDesignId } = useCanvas();
  const createCircle = useMutation(api.design.layers.createObject);
  const file = useQuery(
    api.design.files.getFile,
    activeDesignId
      ? {
          designId: activeDesignId as Id<"designs">,
        }
      : "skip",
  );

  const handleAddCircle = async () => {
    if (!canvas) return;

    const radius = 200;
    const circle = new fabric.Circle({
      radius,
      stroke: "#010101",
      fill: "#f0f0f0",
      strokeWidth: 0,
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

    await createCircle({
      layerObject: {
        pageId: file?.activePage as Id<"pages">,
        type: "CIRCLE",
        height: circle.height,
        left: circle.left,
        radius: circle.radius,
        top: circle.top,
        width: circle.width,
        angle: circle.angle,
        fill: circle.fill ? circle.fill.toString() : undefined,
        opacity: circle.opacity,
        rx: circle.rx,
        ry: circle.ry,
        shadow: circle.shadow ? circle.shadow.toString() : undefined,
        stroke: circle.stroke ? circle.stroke.toString() : undefined,
        strokeWidth: circle.strokeWidth,
        scaleX: circle.scaleX,
        scaleY: circle.scaleY,
        borderScaleFactor: circle.borderScaleFactor,
        strokeUniform: circle.strokeUniform,
        name: "Circle",
      },
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
