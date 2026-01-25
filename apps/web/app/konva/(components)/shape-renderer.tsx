import React from "react";
import { Rect, Circle, Group } from "react-konva";
import Konva from "konva";
import { Id } from "@workspace/backend/_generated/dataModel";
import { CanvasFrame } from "./canvas-frame";
import { TextInputNode } from "./text-input-node";
import { ActiveTool } from "./store";
import { ShapeNode } from "./types";

import { CanvasSection } from "./canvas-section";
import { useShapeDrag } from "./hooks/use-shape-drag";

interface ShapeRendererProps {
  shape: ShapeNode;
  activeShapeId?: Id<"shapes">;
  activeTool: ActiveTool;
  handleShapeUpdate: (e: Konva.KonvaEventObject<DragEvent | Event>) => void;
  handleShapeSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleTextChange: (shapeId: string, newText: string) => void;
  handleDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  // New optional props for snapping context
  parentFrameId?: Id<"shapes">;
  parentSectionId?: Id<"shapes">;
  siblingShapes?: ShapeNode[];
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  activeShapeId,
  activeTool,
  handleShapeUpdate,
  handleShapeSelect,
  handleTextChange,
  handleDblClick,
  parentFrameId,
  siblingShapes = [],
}) => {
  // --- Selection & Draggability Logic ---
  const isSelected = activeShapeId === shape._id;
  const isGroupChild = !!shape.parentShapeId;

  // Must be SELECT tool AND (It's a standalone shape OR It is the specific child we selected)
  const isDraggable = activeTool === "SELECT" && (!isGroupChild || isSelected);

  const { handleDragEnd, handleDragMove } = useShapeDrag({
    shape,
    parentFrameId,
    siblingShapes,
    onDragEnd: handleShapeUpdate,
  });

  // --- Listeners ---
  const listeners = {
    onClick: handleShapeSelect,
    onTransformEnd: handleShapeUpdate,
    // Use our snapping handlers:
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  };

  // --- Render ---
  const commonProps = {
    id: shape._id.toString(),
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    opacity: shape.opacity,
    rotation: shape.rotation,
    stroke: shape.stroke || "black",
    strokeWidth: shape.strokeWidth || 0,
    draggable: isDraggable,
    type: shape.type,
    parentShapeId: shape.parentShapeId,
  };

  switch (shape.type) {
    case "RECT":
      return (
        <Rect
          {...commonProps}
          width={shape.width}
          height={shape.height}
          onDblClick={handleDblClick}
          {...listeners}
        />
      );
    case "CIRCLE":
      return (
        <Circle
          {...commonProps}
          radius={shape.radius || shape.width / 2}
          onDblClick={handleDblClick}
          {...listeners}
        />
      );
    case "GROUP":
      return (
        <Group
          key={shape._id}
          {...commonProps}
          {...listeners}
          id={shape._id}
          type={shape.type}
          onDblClick={handleDblClick}
          // Groups are draggable unless we are editing a child
          draggable={activeTool === "SELECT" && shape._id === activeShapeId}
        >
          {shape.children.map((s) => (
            <ShapeRenderer
              key={s._id}
              activeTool={activeTool}
              shape={s}
              handleShapeSelect={handleShapeSelect}
              handleShapeUpdate={handleShapeUpdate}
              handleTextChange={handleTextChange}
              activeShapeId={activeShapeId}
              handleDblClick={handleDblClick}
            />
          ))}
        </Group>
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
            type: shape.type,
          }}
          shapes={shape.children || []}
          isSelected={isSelected}
          draggable={activeTool === "SELECT"}
          onSelect={handleShapeSelect}
          onShapeUpdate={() => {}}
          handleShapeUpdate={handleShapeUpdate}
          handleTextChange={handleTextChange}
          handleDblClick={handleDblClick}
          activeTool={activeTool}
          activeShapeId={activeShapeId}
        />
      );
    case "SECTION":
      return (
        <CanvasSection
          section={{
            fill: shape.fill,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            id: shape._id.toString(),
            name: shape.name,
            type: shape.type,
            parentShapeId: shape.parentShapeId,
          }}
          shapes={shape.children || []}
          isSelected={isSelected}
          draggable={activeTool === "SELECT"}
          onSelect={handleShapeSelect}
          onShapeUpdate={() => {}}
          handleShapeUpdate={handleShapeUpdate}
          handleTextChange={handleTextChange}
          handleDblClick={handleDblClick}
          activeTool={activeTool}
          activeShapeId={activeShapeId}
          parentFrameId={shape.parentShapeId as Id<"shapes">}
          siblingShapes={siblingShapes}
        />
      );
    case "TEXT":
      return (
        <TextInputNode
          key={shape._id}
          shape={shape}
          isSelected={isSelected}
          onSelect={handleShapeSelect}
          handleShapeUpdate={handleShapeUpdate}
          onTextChange={handleTextChange}
          draggable={isDraggable}
        />
      );

    default:
      return null;
  }
};
