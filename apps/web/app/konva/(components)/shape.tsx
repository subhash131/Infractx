import { Circle, Rect, Text } from "react-konva";
import { ShapeData } from "./types";
import { clearGuides, createSnapHandler } from "./utils";

interface ShapeProps {
  shape: ShapeData;
  frameWidth: number;
  frameHeight: number;
  onUpdate: (id: string, attrs: Partial<ShapeData>) => void;
}

export const Shape: React.FC<ShapeProps> = ({
  shape,
  frameWidth,
  frameHeight,
  onUpdate,
}) => {
  const handleDragMove = createSnapHandler(frameWidth, frameHeight, (pos) => {
    // Update position during drag for real-time snapping
  });

  const handleDragEnd = (e: any) => {
    clearGuides(e);
    onUpdate(shape.id, { x: e.target.x(), y: e.target.y() });
  };

  switch (shape.type) {
    case "text":
      return (
        <Text
          x={shape.x}
          y={shape.y}
          text={shape.text || ""}
          fontSize={shape.fontSize || 16}
          fontStyle="bold"
          fill="#333"
          draggable
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );

    case "circle":
      return (
        <Circle
          x={shape.x}
          y={shape.y}
          radius={shape.radius || 30}
          fill={shape.fill || "#ff9800"}
          opacity={shape.opacity || 0.7}
          draggable
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );

    case "rect":
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width || 60}
          height={shape.height || 60}
          fill={shape.fill || "#ff9800"}
          opacity={shape.opacity || 0.7}
          draggable
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );

    default:
      return null;
  }
};
