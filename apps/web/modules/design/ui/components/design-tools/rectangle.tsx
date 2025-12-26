"use client";
import React from "react";
import * as fabric from "fabric";
import { RectangleHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { v4 as uuidv4 } from "uuid";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export const RectangleTool = () => {
  const { canvas, activeFileId } = useCanvas();
  const createRectangle = useMutation(api.design.layers.createObject);

  const file = useQuery(
    api.design.files.getFile,
    activeFileId
      ? {
          fileId: activeFileId as Id<"files">,
        }
      : "skip"
  );

  const handleAddRectangle = async () => {
    if (!canvas) return;

    const rect = new fabric.Rect({
      width: 600,
      height: 400,
      fill: "#f0f0f0",
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

    await createRectangle({
      pageId: file?.activePage as Id<"pages">,
      type: "RECT",
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
      name: "Rectangle",
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
