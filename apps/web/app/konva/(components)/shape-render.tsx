import React from "react";
import { Rect, Circle } from "react-konva";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { CanvasFrame } from "./canvas-frame";
import Konva from "konva";

interface ShapeRendererProps {
  shape: Doc<"shapes">;
  activeShapeId?: Id<"shapes">;
  handleShapeUpdate?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleShapeSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  handleShapeUpdate,
  handleShapeSelect,
  activeShapeId,
}) => {
  const commonProps = {
    id: shape._id.toString(),
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    opacity: shape.opacity,
    rotation: shape.rotation,
    strokeWidth: shape.strokeWidth,
  };

  switch (shape.type) {
    case "RECT":
      return (
        <Rect
          {...commonProps}
          {...shape}
          id={shape._id}
          width={shape.width}
          height={shape.height}
          draggable
          onDragEnd={handleShapeUpdate}
          onClick={handleShapeSelect}
        />
      );

    case "CIRCLE":
      return (
        <Circle
          {...commonProps}
          {...shape}
          id={shape._id}
          radius={shape.radius || shape.width / 2}
          draggable
          onDragEnd={handleShapeUpdate}
          onClick={handleShapeSelect}
        />
      );

    case "FRAME":
      return (
        <CanvasFrame
          frame={{
            fill: shape.fill,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            id: shape._id.toString(),
          }}
          isSelected={activeShapeId === shape._id}
          onSelect={handleShapeSelect}
          onShapeUpdate={() => {}}
          handleShapeUpdate={handleShapeUpdate}
          shapes={[]}
          onUpdate={() => {}}
        />
      );

    default:
      return null;
  }
};
