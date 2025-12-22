import React, { useState } from "react";
import * as fabric from "fabric";
import { Minus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";

export const LineTool = () => {
  const { canvas, addElement, setSelectedElements, devicePixelRatio } =
    useCanvas();
  const [count, setCount] = useState(0);

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
        borderScaleFactor: 1.2,
        left: (innerWidth * devicePixelRatio) / 2 + count * 10,
        top: (innerHeight * devicePixelRatio) / 3 + count * 10,
        angle: 45,
      }
    );

    canvas.add(line);
    addElement(line);
    canvas.setActiveObject(line);
    setSelectedElements([line]);
    setCount((prev) => prev + 1);
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
