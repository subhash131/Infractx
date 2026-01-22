import React from "react";
import { Rect, Circle, Group, Layer } from "react-konva";
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
  handleDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  activeShapeId,
  activeTool,
  handleShapeUpdate,
  handleShapeSelect,
  handleTextChange,
  handleDblClick,
}) => {
  // 1. Is this specific shape the one currently selected?
  const isSelected = activeShapeId === shape._id;

  // 2. Is this shape a child of a group?
  const isGroupChild = !!shape.parentShapeId;

  // 3. Logic: Should this shape be draggable?
  // - Must be SELECT tool
  // - AND (It's a standalone shape OR It is the specific child we selected)
  const isDraggable = activeTool === "SELECT" && (!isGroupChild || isSelected);

  // 4. Logic: Should we disable the Group's drag?
  // - Only if we are rendering a Group AND one of its children is active
  const hasActiveChild =
    shape.type === "GROUP" &&
    shape.children?.some((child) => child._id === activeShapeId);

  // 5. Listeners Logic
  // - Standalone shapes: Always listen
  // - Children: Only listen if they are explicitly selected (Deep Select)
  // - Otherwise: Pass empty listeners so events bubble to the Parent Group
  const shouldListen = !isGroupChild || isSelected;

  const listeners = shouldListen
    ? {
        onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
          // CRITICAL: If I am a selected child, don't let the Group hear this click!
          // Otherwise, the Group will re-select itself.
          if (isGroupChild) return;
          handleShapeSelect(e);
        },
        onTransformEnd: handleShapeUpdate,
        onDragEnd: handleShapeUpdate,
      }
    : {};

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
          type={shape.type}
          id={shape._id}
          width={shape.width}
          height={shape.height}
          draggable={isDraggable}
          onDblClick={handleDblClick}
          {...listeners}
        />
      );
    case "CIRCLE":
      return (
        <Circle
          {...commonProps}
          {...shape}
          id={shape._id}
          radius={shape.radius || shape.width / 2}
          draggable={isDraggable}
          onDblClick={handleDblClick}
          type={shape.type}
          {...listeners}
        />
      );
    case "GROUP":
      return (
        <Group
          key={shape._id}
          {...commonProps}
          {...shape}
          {...listeners}
          onDblClick={handleDblClick}
          draggable={activeTool === "SELECT" && !hasActiveChild}
        >
          {/* Drag event is blocked for children, identify the cause*/}
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
          isSelected={isSelected}
          draggable={activeTool === "SELECT"}
          onSelect={handleShapeSelect}
          onShapeUpdate={() => {}}
          handleShapeUpdate={handleShapeUpdate}
          handleTextChange={handleTextChange}
          shapes={shape.children || []}
          handleDblClick={handleDblClick}
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
