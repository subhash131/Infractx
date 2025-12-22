import React, { useState } from "react";
import * as fabric from "fabric";
import { Type } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";

export const TextTool = () => {
  const { canvas, addElement, setSelectedElements, devicePixelRatio } =
    useCanvas();
  const [count, setCount] = useState(0);

  const handleAddText = (e: React.MouseEvent) => {
    if (!canvas) {
      console.log("Canvas not initialized");
      return;
    }

    const text = new fabric.IText("Text", {
      left: (innerWidth * devicePixelRatio) / 2 + count * 10,
      top: (innerHeight * devicePixelRatio) / 3 + count * 10,
      fontSize: 20,
      fill: "#000000",
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1.2,
      padding: 8,
    });

    canvas.add(text);
    addElement(text);
    canvas.setActiveObject(text);
    setSelectedElements([text]);
    text.enterEditing();
    setCount((prev) => prev + 1);
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
