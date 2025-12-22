"use client";
import React, { useState } from "react";
import * as fabric from "fabric";
import { RectangleHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../store";

export const RectangleTool = () => {
  const { canvas, devicePixelRatio, addElement, setSelectedElements } =
    useCanvas();
  const [count, setCount] = useState(0);

  const handleAddRectangle = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const rect = new fabric.Rect({
      left: (innerWidth * devicePixelRatio) / 2 + count * 10,
      top: (innerHeight * devicePixelRatio) / 3 + count * 10,
      width: 100,
      height: 100,
      fill: "#D9D9D9",
      strokeWidth: 1,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
    });

    canvas.add(rect);
    addElement(rect);
    canvas.setActiveObject(rect);
    setSelectedElements([rect]);
    setCount((prev) => prev + 1);
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
