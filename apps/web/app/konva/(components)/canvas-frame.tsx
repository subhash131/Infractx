import Konva from "konva";
import React, { useEffect, useRef } from "react";
import { Group, Rect, Transformer } from "react-konva";
import { FrameData, ShapeData } from "./types";
import { Shape } from "./shape";

interface CanvasFrameProps {
  frame: FrameData;
  shapes: ShapeData[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<FrameData>) => void;
  onShapeUpdate: (id: string, attrs: Partial<ShapeData>) => void;
}

export const CanvasFrame: React.FC<CanvasFrameProps> = ({
  frame,
  shapes,
  isSelected,
  onSelect,
  onUpdate,
  onShapeUpdate,
}) => {
  const outerGroupRef = useRef<Konva.Group>(null);
  const innerGroupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && rectRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

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
      x={frame.x}
      y={frame.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate(frame.id, { x: e.target.x(), y: e.target.y() });
      }}
    >
      <Group
        ref={innerGroupRef}
        clipX={0}
        clipY={0}
        clipWidth={frame.width}
        clipHeight={frame.height}
      >
        <Rect
          ref={rectRef}
          width={frame.width}
          height={frame.height}
          fill={frame.fill}
          cornerRadius={4}
          shadowColor="black"
          shadowBlur={isSelected ? 10 : 5}
          shadowOpacity={isSelected ? 0.3 : 0.1}
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

      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50 || newBox.height < 50) return oldBox;
            return newBox;
          }}
          rotateEnabled={false}
          borderStroke="#2196f3"
          borderStrokeWidth={1}
          anchorStroke="#2196f3"
          anchorFill="white"
          anchorSize={8}
          anchorCornerRadius={2}
        />
      )}
    </Group>
  );
};
