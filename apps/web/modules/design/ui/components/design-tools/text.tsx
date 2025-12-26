"use client";
import React from "react";
import * as fabric from "fabric";
import { Type } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";

export const TextTool = () => {
  const { canvas } = useCanvas();

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
