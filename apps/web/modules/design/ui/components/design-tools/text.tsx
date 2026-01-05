"use client";
import React from "react";
import * as fabric from "fabric";
import { Type } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

export const TextTool = () => {
  const { canvas, activeFileId } = useCanvas();
  const createText = useMutation(api.design.layers.createObject);
  const file = useQuery(
    api.design.files.getFile,
    activeFileId
      ? {
          fileId: activeFileId as Id<"files">,
        }
      : "skip"
  );

  const handleAddText = async () => {
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
    await createText({
      layerObject: {
        pageId: file?.activePage as Id<"pages">,
        type: "TEXT",
        height: text.height,
        left: text.left,
        top: text.top,
        width: text.width,
        angle: text.angle,
        fill: text.fill ? text.fill.toString() : undefined,
        opacity: text.opacity,
        rx: text.rx,
        ry: text.ry,
        shadow: text.shadow ? text.shadow.toString() : undefined,
        stroke: text.stroke ? text.stroke.toString() : undefined,
        strokeWidth: text.strokeWidth,
        scaleX: text.scaleX,
        scaleY: text.scaleY,
        borderScaleFactor: text.borderScaleFactor,
        strokeUniform: text.strokeUniform,
        name: "Text",
      },
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
