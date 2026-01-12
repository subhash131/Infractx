import React, { useState } from "react";
import * as fabric from "fabric";
import { Pen } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";

export const PencilTool = () => {
  const { canvas, setSelectedElements } = useCanvas();

  const handleAddPencil = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const path = new fabric.Path("M 0 0 Q 25 25 50 0 T 100 25 T 150 0", {
      stroke: "#000000",
      strokeWidth: 2,
      fill: "",
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
    });

    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    const centerX = (canvas.width / 2 - vpt[4]) / zoom;
    const centerY = (canvas.height / 2 - vpt[5]) / zoom;
    path.set({
      left: centerX - path.width / 2 + canvas._objects.length * 10,
      top: centerY - path.height / 2 + canvas._objects.length * 10,
    });
    canvas.add(path);
  };

  return (
    <Button
      onClick={handleAddPencil}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Pen className="h-4 w-4" />
      Pencil
    </Button>
  );
};
