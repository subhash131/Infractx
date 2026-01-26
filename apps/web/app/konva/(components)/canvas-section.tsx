import Konva from "konva";
import React, { useRef } from "react";
import { Group, Rect } from "react-konva";
import { SectionData, ShapeData, ShapeNode } from "./types";
import { ActiveTool } from "./store";
import { KonvaEventObject } from "konva/lib/Node";
import { ShapeRenderer } from "./shape-renderer";
import { Id } from "@workspace/backend/_generated/dataModel";

interface CanvasSectionProps {
  section: SectionData;
  shapes: ShapeNode[];
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onShapeUpdate: (id: string, attrs: Partial<ShapeData>) => void;
  handleTextChange: (shapeId: string, newText: string) => void;
  handleShapeUpdate: (
    e: Konva.KonvaEventObject<DragEvent | Event>,
    shapeId?: Id<"shapes">,
  ) => void;
  handleDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  activeTool?: ActiveTool;
  activeShapeId?: Id<"shapes">;
  siblingShapes?: ShapeNode[];
  stageRef: React.RefObject<null | Konva.Stage>;
}

export const CanvasSection: React.FC<CanvasSectionProps> = ({
  section,
  shapes,
  onSelect,
  handleShapeUpdate,
  handleTextChange,
  handleDblClick,
  activeTool = "SELECT",
  activeShapeId,
  handleDragMove,
  stageRef,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);

  const handleTransform = () => {
    const rectNode = rectRef.current;
    const groupNode = groupRef.current;

    if (!rectNode || !groupNode) return;

    const scaleX = rectNode.scaleX();
    const scaleY = rectNode.scaleY();

    groupNode.clipX(rectNode.x());
    groupNode.clipY(rectNode.y());
    groupNode.clipWidth(rectNode.width() * scaleX);
    groupNode.clipHeight(rectNode.height() * scaleY);
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const rectNode = rectRef.current;
    const groupNode = groupRef.current;

    if (!rectNode || !groupNode) return;

    const scaleX = rectNode.scaleX();
    const scaleY = rectNode.scaleY();
    const offsetX = rectNode.x();
    const offsetY = rectNode.y();

    const finalWidth = Math.max(5, rectNode.width() * scaleX);
    const finalHeight = Math.max(5, rectNode.height() * scaleY);
    const newX = groupNode.x() + offsetX;
    const newY = groupNode.y() + offsetY;

    groupNode.x(newX);
    groupNode.y(newY);
    rectNode.width(finalWidth);
    rectNode.height(finalHeight);
    rectNode.x(0);
    rectNode.y(0);
    rectNode.scaleX(1);
    rectNode.scaleY(1);

    groupNode.clipX(0);
    groupNode.clipY(0);
    groupNode.clipWidth(finalWidth);
    groupNode.clipHeight(finalHeight);

    const syntheticEvent = {
      ...e,
      target: groupNode,
    };

    syntheticEvent.target.attrs.height = finalHeight;
    syntheticEvent.target.attrs.width = finalWidth;
    syntheticEvent.target.attrs.type = "SECTION";

    handleShapeUpdate(syntheticEvent as any, section.id as Id<"shapes">);
  };

  return (
    <Group
      ref={groupRef}
      draggable={activeShapeId === section.id}
      onClick={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={(e) => handleShapeUpdate(e, section.id as Id<"shapes">)}
      width={section.width}
      height={section.height}
      x={section.x}
      y={section.y}
      name={`section-${section.id}`}
      type={section.type}
      parentShapeId={section.parentShapeId}
    >
      <Rect
        {...section}
        id={section.id}
        ref={rectRef}
        x={0}
        y={0}
        fill={"blue"}
        stroke={"#f0f0f0"}
        name={`section-rect-${section.id}`}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
        type={section.type}
      />
      {shapes.map((childNode) => {
        return (
          <ShapeRenderer
            key={childNode._id}
            shape={childNode}
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
            parentSectionId={section.id as Id<"shapes">}
            stageRef={stageRef}
          />
        );
      })}
    </Group>
  );
};
