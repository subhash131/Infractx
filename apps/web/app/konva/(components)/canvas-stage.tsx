"use client";
import React, { useEffect, useRef } from "react";
import { Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";

import { GridPattern } from "./grid-pattern";
import { ShapePreview } from "./shape-preview";

import { useCanvasZoom } from "./hooks/use-canvas-zoom";
import { useShapeDrawing } from "./hooks/use-shape-drawing";
import useCanvas from "./store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ShapeRenderer } from "./shape-render";

export const CanvasStage: React.FC = () => {
  const { activeTool, setActiveShapeId, activeShapeId } = useCanvas();
  const { stageScale, stagePos, handleWheel } = useCanvasZoom();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const { newShape, handlePointerDown, handlePointerMove, handleMouseUp } =
    useShapeDrawing();

  const shapes = useQuery(api.design.shapes.getShapesByPage, {
    pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
  });
  const updateShape = useMutation(api.design.shapes.updateShape);

  const handleShapeChange = (e: Konva.KonvaEventObject<DragEvent>) => {
    console.log("Shape changed", e);
    updateShape({
      shapeId: e.target.attrs.id as Id<"shapes">,
      shapeObject: {
        x: e.target.x(),
        y: e.target.y(),
        width: e.target.width(),
        height: e.target.height(),
        rotation: e.target.rotation(),
      },
    });
  };

  const handleShapeSelect = (e: Konva.KonvaEventObject<MouseEvent>) => {
    console.log("Shape selected", e);
    setActiveShapeId(e.target.attrs.id as Id<"shapes">);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!activeShapeId || !stage) return;
    const activeShape = stage.findOne(`#${activeShapeId.toString()}`);
    console.log("Active shape:", activeShape);
    if (activeShape && transformerRef.current) {
      transformerRef.current.nodes([activeShape]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [activeShapeId]);

  return (
    <Stage
      ref={stageRef}
      width={typeof window !== "undefined" ? window.innerWidth : 800}
      height={typeof window !== "undefined" ? window.innerHeight : 600}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stagePos.x}
      y={stagePos.y}
      draggable={activeTool === "SELECT"}
      style={{ background: "#ffffff" }}
    >
      <Layer>
        <GridPattern />
        {shapes?.map((shape) => (
          <ShapeRenderer
            key={shape._id}
            shape={shape}
            handleShapeUpdate={handleShapeChange}
            handleShapeSelect={handleShapeSelect}
            activeShapeId={activeShapeId}
          />
        ))}

        {newShape && <ShapePreview shape={newShape} />}

        {activeShapeId && (
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
      </Layer>
    </Stage>
  );
};
