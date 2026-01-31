import React from "react";
import { Rect, Circle } from "react-konva";
import useCanvas from "./store";

interface ShapePreviewProps {
  shape: {
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  };
}

export const ShapePreview: React.FC<ShapePreviewProps> = ({ shape }) => {
  const { activeTool } = useCanvas();

  switch (activeTool) {
    case "FRAME":
    case "RECT":
    case "TEXT":
    case "SECTION":
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="rgba(33, 150, 243, 0.2)"
          stroke="rgba(33, 150, 243, 1)"
          strokeWidth={1}
        />
      );
    case "CIRCLE":
      return (
        <Circle
          radius={shape.radius}
          x={shape.x}
          y={shape.y}
          fill="rgba(33, 150, 243, 0.2)"
          stroke="rgba(33, 150, 243, 1)"
          strokeWidth={1}
        />
      );
    default:
      return null;
  }
};
