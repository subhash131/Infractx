import React, { useState } from "react";
import * as fabric from "fabric";
import { Pen } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";

export const PencilTool = () => {
  const { canvas, addElement, setSelectedElements, devicePixelRatio } =
    useCanvas();
  const [count, setCount] = useState(0);

  const handleAddPencil = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    // Create a simple path that looks like a pencil drawing
    const path = new fabric.Path("M 0 0 Q 25 25 50 0 T 100 25 T 150 0", {
      left: (innerWidth * devicePixelRatio) / 2 + count * 10,
      top: (innerHeight * devicePixelRatio) / 3 + count * 10,
      stroke: "#000000",
      strokeWidth: 2,
      fill: "",
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
    });

    canvas.add(path);
    addElement(path);
    canvas.setActiveObject(path);
    setSelectedElements([path]);
    setCount((prev) => prev + 1);
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
