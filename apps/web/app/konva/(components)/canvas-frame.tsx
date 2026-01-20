import Konva from "konva";
import React, { useRef } from "react";
import { Group, Rect, Text, Circle } from "react-konva";
import { FrameData, ShapeData, ShapeNode } from "./types";
import { ShapeRenderer } from "./shape-render";
import {
  getObjectSnappingEdges,
  getGuides,
  drawGuides,
} from "./frame-snapping-util";
import { ActiveTool } from "./store";

interface CanvasFrameProps {
  frame: FrameData;
  shapes: ShapeNode[];
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (id: string, attrs: Partial<FrameData>) => void;
  onShapeUpdate: (id: string, attrs: Partial<ShapeData>) => void;
  handleShapeUpdate: (
    e: Konva.KonvaEventObject<DragEvent>,
    shapeId?: string,
  ) => void;
  draggable: boolean;
  activeTool?: ActiveTool;
}

interface SnappableShapeProps {
  shape: ShapeNode;
  parentFrame: FrameData;
  siblingShapes: ShapeNode[];
  handleShapeUpdate: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleShapeSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  activeTool: string;
}

const SnappableShape: React.FC<SnappableShapeProps> = ({
  shape,
  parentFrame,
  siblingShapes,
  handleShapeUpdate,
  handleShapeSelect,
  activeTool,
}) => {
  // Helper to remove lines
  const clearGuides = (layer: Konva.Layer) => {
    layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const layer = node.getLayer();
    const stage = node.getStage();

    if (!layer || !stage) return;

    // 1. Cleanup old guides using helper
    clearGuides(layer);

    // 2. Find Snap Stops (Absolute Coordinates)
    const vertical: number[] = [];
    const horizontal: number[] = [];

    // -- Parent Frame Stops --
    const frameNode = layer.findOne(`#${parentFrame.id}`);
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

    // -- Sibling Shapes Stops --
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

    // Draw guides constrained to frame bounds
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

  // NEW: Handle Drag End to clean up lines and save state
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const layer = node.getLayer();

    if (layer) {
      clearGuides(layer); // Remove the red/magenta lines
    }

    // Trigger the update to your state manager (Redux/Zustand/etc)
    handleShapeUpdate(e);
  };

  const commonProps = {
    id: shape._id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    opacity: shape.opacity,
    rotation: shape.rotation,
    stroke: shape.stroke || "black",
    strokeWidth: shape.strokeWidth || 0,
    draggable: activeTool === "SELECT",
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd, // <--- IMPORTANT ADDITION
    onClick: handleShapeSelect,
    onDragStart: handleShapeSelect,
    onTransformEnd: handleShapeUpdate,
  };

  switch (shape.type) {
    case "RECT":
      return (
        <Rect {...commonProps} width={shape.width} height={shape.height} />
      );
    case "CIRCLE":
      return <Circle {...commonProps} radius={shape.width / 2} />;
    default:
      return null;
  }
};

export const CanvasFrame: React.FC<CanvasFrameProps> = ({
  frame,
  shapes,
  onSelect,
  onUpdate,
  handleShapeUpdate,
  draggable,
  activeTool = "SELECT",
}) => {
  const outerGroupRef = useRef<Konva.Group>(null);
  const innerGroupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);

  const handleTransform = () => {
    const rectNode = rectRef.current;
    const innerGroupNode = innerGroupRef.current;

    if (!rectNode || !innerGroupNode) return;

    const scaleX = rectNode.scaleX();
    const scaleY = rectNode.scaleY();

    innerGroupNode.clipX(rectNode.x());
    innerGroupNode.clipY(rectNode.y());
    innerGroupNode.clipWidth(rectNode.width() * scaleX);
    innerGroupNode.clipHeight(rectNode.height() * scaleY);
  };

  const handleTransformEnd = () => {
    const rectNode = rectRef.current;
    const outerGroupNode = outerGroupRef.current;
    const innerGroupNode = innerGroupRef.current;

    if (!rectNode || !outerGroupNode || !innerGroupNode) return;

    const scaleX = rectNode.scaleX();
    const scaleY = rectNode.scaleY();
    const offsetX = rectNode.x();
    const offsetY = rectNode.y();

    const finalWidth = Math.max(5, rectNode.width() * scaleX);
    const finalHeight = Math.max(5, rectNode.height() * scaleY);

    rectNode.x(0);
    rectNode.y(0);
    rectNode.scaleX(1);
    rectNode.scaleY(1);

    innerGroupNode.clipX(0);
    innerGroupNode.clipY(0);
    innerGroupNode.clipWidth(finalWidth);
    innerGroupNode.clipHeight(finalHeight);

    onUpdate(frame.id, {
      x: outerGroupNode.x() + offsetX,
      y: outerGroupNode.y() + offsetY,
      width: finalWidth,
      height: finalHeight,
    });
  };

  return (
    <Group
      ref={outerGroupRef}
      draggable={draggable}
      onClick={onSelect}
      onDragEnd={(e) => {
        if (!e || !handleShapeUpdate) return;
        handleShapeUpdate(e, frame.id);
      }}
      width={frame.width}
      height={frame.height}
      x={frame.x}
      y={frame.y}
      name="outerGroupRef"
    >
      <Text
        text={frame.name}
        width={frame.width}
        fill={"#2196f3"}
        height={20}
        fontSize={20}
        y={-25}
        x={10}
      />
      <Group
        ref={innerGroupRef}
        clipX={0}
        clipY={0}
        clipWidth={frame.width}
        clipHeight={frame.height}
        id={frame.id}
        name="innerGroupRef"
      >
        <Rect
          id={frame.id}
          ref={rectRef}
          width={frame.width}
          height={frame.height}
          fill={frame.fill}
          shadowEnabled={false}
          stroke={"#e0e0e0"}
          shadowOffsetX={2}
          shadowOffsetY={2}
          name={`frame-rect-${frame.id}`}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
        {shapes.map((childNode) => {
          // For nested FRAME types, use ShapeRenderer to preserve recursive rendering
          if (childNode.type === "FRAME") {
            return (
              <ShapeRenderer
                key={childNode._id}
                shape={childNode}
                activeTool={activeTool}
                handleShapeSelect={onSelect}
                handleShapeUpdate={handleShapeUpdate}
              />
            );
          }

          // For RECT and CIRCLE, use snappable version
          if (childNode.type === "RECT" || childNode.type === "CIRCLE") {
            return (
              <SnappableShape
                key={childNode._id}
                shape={childNode}
                parentFrame={frame}
                siblingShapes={shapes}
                handleShapeUpdate={handleShapeUpdate}
                handleShapeSelect={onSelect}
                activeTool={activeTool}
              />
            );
          }

          return null;
        })}
      </Group>
    </Group>
  );
};
