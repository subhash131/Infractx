import React from "react";
import { Rect, Circle } from "react-konva";
import { Id } from "@workspace/backend/_generated/dataModel";
import { CanvasFrame } from "./canvas-frame";
import Konva from "konva";
import { ActiveTool } from "./store";
import { ShapeNode } from "./types";
import { TextInputNode } from "./text-input-node";

interface ShapeRendererProps {
  shape: ShapeNode;
  activeShapeId?: Id<"shapes">;
  activeTool: ActiveTool;
  handleShapeUpdate: (e: Konva.KonvaEventObject<DragEvent | Event>) => void;
  handleShapeSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleTextChange: (shapeId: string, newText: string) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  activeShapeId,
  activeTool,
  handleShapeUpdate,
  handleShapeSelect,
  handleTextChange,
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
          draggable={activeTool === "SELECT"}
          onClick={handleShapeSelect}
          onDragStart={handleShapeSelect}
          onTransformEnd={handleShapeUpdate}
        />
      );
    case "CIRCLE":
      return (
        <Circle
          {...commonProps}
          {...shape}
          id={shape._id}
          radius={shape.radius || shape.width / 2}
          draggable={activeTool === "SELECT"}
          onClick={handleShapeSelect}
          onDragStart={handleShapeSelect}
          onTransformEnd={handleShapeUpdate}
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
            name: shape.name,
          }}
          isSelected={activeShapeId === shape._id}
          draggable={activeTool === "SELECT"}
          onSelect={handleShapeSelect}
          onShapeUpdate={() => {}}
          handleShapeUpdate={handleShapeUpdate}
          handleTextChange={handleTextChange}
          shapes={shape.children || []}
        />
      );
    case "TEXT":
      return (
        <TextInputNode
          key={shape._id}
          shape={shape}
          isSelected={activeShapeId === shape._id}
          onSelect={handleShapeSelect}
          handleShapeUpdate={handleShapeUpdate}
          draggable={activeTool === "SELECT"}
          onTextChange={handleTextChange}
        />
      );

    default:
      return null;
  }
};
