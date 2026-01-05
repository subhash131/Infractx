"use client";
import React from "react";
import * as fabric from "fabric";
import { Minus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { TOOLS } from "../../constants";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export const LineTool = () => {
  const { canvas, activeFileId } = useCanvas();
  const createLine = useMutation(api.design.layers.createObject);
  const file = useQuery(
    api.design.files.getFile,
    activeFileId
      ? {
          fileId: activeFileId as Id<"files">,
        }
      : "skip"
  );

  const handleAddLine = async () => {
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

    canvas.add(line);

    await createLine({
      layerObject: {
        pageId: file?.activePage as Id<"pages">,
        type: "LINE",
        height: line.height,
        left: line.left,
        radius: line.radius,
        top: line.top,
        width: line.width,
        angle: line.angle,
        fill: line.fill ? line.fill.toString() : undefined,
        opacity: line.opacity,
        rx: line.rx,
        ry: line.ry,
        shadow: line.shadow ? line.shadow.toString() : undefined,
        stroke: line.stroke ? line.stroke.toString() : undefined,
        strokeWidth: line.strokeWidth,
        scaleX: line.scaleX,
        scaleY: line.scaleY,
        borderScaleFactor: line.borderScaleFactor,
        strokeUniform: line.strokeUniform,
        name: "Line",
        points: line.points,
      },
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
