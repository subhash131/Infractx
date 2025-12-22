import React, { useState } from "react";
import * as fabric from "fabric";
import { Circle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../store";

export const CircleTool = () => {
  const { canvas, addElement } = useCanvas();
  const [count, setCount] = useState(0);

  const handleAddCircle = () => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const circle = new fabric.Circle({
      left: innerWidth / 2 + count * 10,
      top: innerHeight / 3 + count * 10,
      radius: 50,
      fill: "#D9D9D9",
      strokeWidth: 1,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
    });

    canvas.add(circle);
    addElement(circle);
    setCount((prev) => prev + 1);
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
