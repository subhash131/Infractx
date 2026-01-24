import React from "react";
import { Rect, Circle, Group } from "react-konva";
import Konva from "konva";
import { Id } from "@workspace/backend/_generated/dataModel";
import { CanvasFrame } from "./canvas-frame";
import { TextInputNode } from "./text-input-node";
import { ActiveTool } from "./store";
import { ShapeNode } from "./types";
import {
  getGuides,
  getObjectSnappingEdges,
  drawGuides,
} from "./frame-snapping-util";
import { CanvasSection } from "./canvas-section";

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

  // Disable Group drag if a child is active
  const hasActiveChild =
    shape.type === "GROUP" &&
    shape.children?.some((child) => child._id === activeShapeId);

  // --- Snapping Logic ---

  const clearGuides = (layer: Konva.Layer) => {
    layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    console.log("handleDragMove ::", node.id(), node.parent?.id());

    const layer = node.getLayer();
    const stage = node.getStage();

    if (!layer || !stage) return;

    // 1. Cleanup old guides
    clearGuides(layer);

    // 2. Find Snap Stops (Absolute Coordinates)
    const vertical: number[] = [];
    const horizontal: number[] = [];

    // -- Parent Frame Stops --
    let frameNode: Konva.Node | undefined;
    if (parentFrameId) {
      frameNode = layer.findOne(`.frame-rect-${parentFrameId}`);
      if (frameNode) {
        const frameBox = frameNode.getClientRect({ relativeTo: layer });
        vertical.push(
          frameBox.x,
          frameBox.x + frameBox.width,
          frameBox.x + frameBox.width / 2,
        );
        horizontal.push(
          frameBox.y,
          frameBox.y + frameBox.height,
          frameBox.y + frameBox.height / 2,
        );
      }
    }

    // -- Sibling Shapes Stops --
    // We filter out the current shape from siblings to avoid self-snapping
    siblingShapes.forEach((sibling) => {
      if (sibling._id === shape._id) return;

      const siblingNode = layer.findOne(`#${sibling._id}`);
      if (!siblingNode) return;

      const siblingBox = siblingNode.getClientRect({ relativeTo: layer });

      vertical.push(
        siblingBox.x,
        siblingBox.x + siblingBox.width,
        siblingBox.x + siblingBox.width / 2,
      );
      horizontal.push(
        siblingBox.y,
        siblingBox.y + siblingBox.height,
        siblingBox.y + siblingBox.height / 2,
      );
    });

    // 3. Calculate Guides
    const itemBounds = getObjectSnappingEdges(node);
    if (!itemBounds) return;

    const guides = getGuides(
      { vertical, horizontal },
      itemBounds,
      stage.scaleX(),
    );

    if (!guides.length) return;

    // Draw guides constrained to frame bounds (if frame exists), otherwise infinite
    const frameBounds = frameNode
      ? frameNode.getClientRect({ relativeTo: layer })
      : undefined;

    drawGuides(guides, layer, undefined, frameBounds);

    // 4. Apply Snap using Absolute Positioning
    const currentAbsPos = node.getAbsolutePosition();
    const currentClientRect = node.getClientRect({ relativeTo: layer });

    const anchorOffsetX = currentAbsPos.x - currentClientRect.x;
    const anchorOffsetY = currentAbsPos.y - currentClientRect.y;

    const newPos = {
      x: currentAbsPos.x,
      y: currentAbsPos.y,
    };

    guides.forEach((lg) => {
      if (lg.orientation === "V") {
        newPos.x = lg.lineGuide - lg.offset + anchorOffsetX;
      } else {
        newPos.y = lg.lineGuide - lg.offset + anchorOffsetY;
      }
    });

    node.setAbsolutePosition(newPos);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const layer = node.getLayer();

    if (layer) {
      clearGuides(layer);
    }
    console.log("DragEnd ::", node.id(), node.parent?.id());
    handleShapeUpdate(e);
  };

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
    parentId: shape.parentShapeId,
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
          draggable={activeTool === "SELECT" && !hasActiveChild}
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
          // Frame is a top-level object usually, but if nested, pass context
          activeShapeId={activeShapeId}
        />
      );
    case "SECTION":
      return (
        <CanvasSection
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
