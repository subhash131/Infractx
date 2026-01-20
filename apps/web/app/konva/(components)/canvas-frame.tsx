import Konva from "konva";
import React, { useEffect, useRef } from "react";
import { Group, Rect, Transformer } from "react-konva";
import { FrameData, ShapeData } from "./types";
import { Shape } from "./shape";

interface CanvasFrameProps {
  frame: FrameData;
  shapes: ShapeData[];
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (id: string, attrs: Partial<FrameData>) => void;
  onShapeUpdate: (id: string, attrs: Partial<ShapeData>) => void;
  handleShapeUpdate?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export const CanvasFrame: React.FC<CanvasFrameProps> = ({
  frame,
  shapes,
  isSelected,
  onSelect,
  onUpdate,
  onShapeUpdate,
  handleShapeUpdate,
}) => {
  const outerGroupRef = useRef<Konva.Group>(null);
  const innerGroupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);

  // 1. LIVE UPDATE: Syncs clip mask to the moving rect
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

  // 2. STATE COMMIT: Resets everything to 0,0 relative to the new Group position
  const handleTransformEnd = () => {
    const rectNode = rectRef.current;
    const outerGroupNode = outerGroupRef.current;
    const innerGroupNode = innerGroupRef.current;

    if (!rectNode || !outerGroupNode || !innerGroupNode) return;

    const scaleX = rectNode.scaleX();
    const scaleY = rectNode.scaleY();
    const offsetX = rectNode.x();
    const offsetY = rectNode.y();

    // Calculate final dimensions
    const finalWidth = Math.max(5, rectNode.width() * scaleX);
    const finalHeight = Math.max(5, rectNode.height() * scaleY);

    // Reset Rect
    rectNode.x(0);
    rectNode.y(0);
    rectNode.scaleX(1);
    rectNode.scaleY(1);

    // Reset Clip Group
    // Since Rect is back at 0,0, Clip must be back at 0,0 too.
    innerGroupNode.clipX(0);
    innerGroupNode.clipY(0);
    innerGroupNode.clipWidth(finalWidth);
    innerGroupNode.clipHeight(finalHeight);

    // Move the outer group to the new position
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
      draggable
      onClick={onSelect}
      onDragEnd={handleShapeUpdate}
      id={frame.id}
      width={frame.width}
      height={frame.height}
      x={frame.x}
      y={frame.y}
    >
      <Group
        ref={innerGroupRef}
        clipX={0}
        clipY={0}
        clipWidth={frame.width}
        clipHeight={frame.height}
        id={frame.id}
      >
        <Rect
          id={frame.id}
          ref={rectRef}
          width={frame.width}
          height={frame.height}
          fill={frame.fill}
          cornerRadius={20}
          shadowEnabled={false}
          stroke={"#e0e0e0"}
          shadowOffsetX={2}
          shadowOffsetY={2}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
        {shapes.map((shape) => (
          <Shape
            key={shape.id}
            shape={shape}
            frameWidth={frame.width}
            frameHeight={frame.height}
            onUpdate={onShapeUpdate}
          />
        ))}
      </Group>
    </Group>
  );
};
