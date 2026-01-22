import Konva from "konva";
import React, { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { FrameData, ShapeData, ShapeNode } from "./types";
import { ActiveTool } from "./store";
import { KonvaEventObject } from "konva/lib/Node";
import { ShapeRenderer } from "./shape-renderer";
import { Id } from "@workspace/backend/_generated/dataModel";

interface CanvasFrameProps {
  frame: FrameData;
  shapes: ShapeNode[];
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onShapeUpdate: (id: string, attrs: Partial<ShapeData>) => void;
  handleTextChange: (shapeId: string, newText: string) => void;
  handleShapeUpdate: (
    e: Konva.KonvaEventObject<DragEvent | Event>,
    shapeId?: string,
  ) => void;
  handleDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  draggable: boolean;
  activeTool?: ActiveTool;
  activeShapeId?: Id<"shapes">;
}

export const CanvasFrame: React.FC<CanvasFrameProps> = ({
  frame,
  shapes,
  onSelect,
  handleShapeUpdate,
  handleTextChange,
  handleDblClick,
  draggable,
  activeTool = "SELECT",
  activeShapeId,
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

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
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
    const newX = outerGroupNode.x() + offsetX;
    const newY = outerGroupNode.y() + offsetY;

    outerGroupNode.x(newX);
    outerGroupNode.y(newY);
    rectNode.width(finalWidth);
    rectNode.height(finalHeight);
    rectNode.x(0);
    rectNode.y(0);
    rectNode.scaleX(1);
    rectNode.scaleY(1);

    innerGroupNode.clipX(0);
    innerGroupNode.clipY(0);
    innerGroupNode.clipWidth(finalWidth);
    innerGroupNode.clipHeight(finalHeight);

    const syntheticEvent = {
      ...e,
      target: outerGroupNode,
    };

    syntheticEvent.target.attrs["id"] = frame.id;
    syntheticEvent.target.attrs.height = finalHeight;
    syntheticEvent.target.attrs.width = finalWidth;

    handleShapeUpdate(syntheticEvent as any);
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
      name="Frame"
      type={frame.type}
    >
      <Text
        text={frame.name}
        width={frame.width}
        fill={"#2196f3"}
        height={20}
        fontSize={40}
        y={-45}
        x={10}
      />
      <Group
        ref={innerGroupRef}
        clipX={0}
        clipY={0}
        clipWidth={frame.width}
        clipHeight={frame.height}
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
          type={frame.type}
        />
        {shapes.map((childNode) => {
          return (
            <ShapeRenderer
              key={childNode._id}
              shape={childNode}
              // Pass context for snapping
              parentFrame={frame}
              // Filter the current node, or else the shape ID will be messed up
              siblingShapes={shapes.filter(
                (sibling) => sibling._id !== childNode._id,
              )}
              // Standard props
              handleShapeUpdate={handleShapeUpdate}
              handleShapeSelect={onSelect}
              handleDblClick={handleDblClick}
              handleTextChange={handleTextChange}
              activeTool={activeTool}
              activeShapeId={activeShapeId}
            />
          );
        })}
      </Group>
    </Group>
  );
};
