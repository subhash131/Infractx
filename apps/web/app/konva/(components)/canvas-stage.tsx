"use client";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Stage, Text, Transformer } from "react-konva";
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
import { useKeyboardControls } from "./hooks/use-keyboard-controls";
import { buildShapeTree } from "./utils";
import { ShapeNode } from "./types";
import { TextInputNode } from "./text-input-node";

export const CanvasStage: React.FC = () => {
  const { activeTool, setActiveShapeId, activeShapeId } = useCanvas();
  const [activeTree, setActiveTree] = useState<ShapeNode[]>([]);
  const { stageScale, stagePos, handleWheel } = useCanvasZoom();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const { newShape, handlePointerDown, handlePointerMove, handleMouseUp } =
    useShapeDrawing();

  const shapes = useQuery(api.design.shapes.getShapesByPage, {
    pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
  });
  const updateShape = useMutation(api.design.shapes.updateShape);
  const deleteShape = useMutation(api.design.shapes.deleteShape);

  useEffect(() => {
    if (shapes) {
      const tree = buildShapeTree(shapes);
      setActiveTree(tree);
    }
  }, [shapes]);

  const handleTextChange = async (shapeId: string, newText: string) => {
    console.log({ shapeId, newText });
    await updateShape({
      shapeId: shapeId as Id<"shapes">,
      shapeObject: {
        text: newText,
      },
    });
  };

  const handleShapeUpdate = async (
    e: Konva.KonvaEventObject<DragEvent | Event>,
    shapeId?: string,
  ) => {
    const node = e.target;

    // 1. Calculate new dimensions based on the current scale
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // 2. Reset the scale back to 1
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);

    // 3. OPTIMISTIC UPDATE: Apply the new size to the node IMMEDIATELY.
    // This stops the shape from shrinking while waiting for the DB.
    node.width(newWidth);
    node.height(newHeight);

    // 4. Send to DB (ensure you also save scaleX: 1)
    await updateShape({
      shapeId: node.attrs.id || shapeId,
      shapeObject: {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
        scaleX: 1, // Explicitly save the reset scale
        scaleY: 1,
      },
    });
  };

  const handleShapeSelect = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setActiveShapeId(e.target.attrs.id);
  };

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;

    if (!activeShapeId || !stage || !transformer) return;
    const targetNode =
      stage.findOne(`.frame-rect-${activeShapeId}`) ||
      stage.findOne(`#${activeShapeId}`);

    if (targetNode) {
      transformer.nodes([targetNode]);
      transformer.getLayer()?.batchDraw();
    }
  }, [activeShapeId]);

  useKeyboardControls({
    stageRef,
    activeShapeId,
    onDelete: (shapeId) => deleteShape({ shapeId }),
    onUpdate: (shapeId, updates) =>
      updateShape({ shapeId, shapeObject: updates }),
    onDeselect: () => setActiveShapeId(undefined),
  });

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
      style={{ background: "#1E1E1E" }}
    >
      <Layer>
        <GridPattern />
        {activeTree.map((node) => (
          <ShapeRenderer
            key={node._id}
            shape={node}
            handleShapeUpdate={handleShapeUpdate}
            handleShapeSelect={handleShapeSelect}
            activeShapeId={activeShapeId}
            activeTool={activeTool}
            handleTextChange={handleTextChange}
          />
        ))}

        {newShape && <ShapePreview shape={newShape} />}

        {activeShapeId && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
            rotateEnabled={false}
            rotateLineVisible={false}
            borderStroke="#2196f3"
            borderStrokeWidth={1}
            anchorStroke="#2196f3"
            anchorFill="white"
            anchorSize={8}
            anchorCornerRadius={2}
            anchorStyleFunc={(anchor) => {
              // 1. Get the node this transformer is attached to
              // anchor.getParent() is the Transformer itself
              const transformer = anchor.getParent();
              if (!transformer) return;
              const node = (transformer as any).nodes()[0];
              if (!node) return;

              // 2. Check if the attached node is a Circle
              //TODO:
              if (node.getClassName() === "Circle") {
                if (
                  anchor.hasName("middle-left") ||
                  anchor.hasName("middle-right") ||
                  anchor.hasName("top-center") ||
                  anchor.hasName("bottom-center") ||
                  anchor.hasName("rotater")
                ) {
                  anchor.width(0);
                  anchor.height(0);
                }
              }
            }}
          />
        )}
      </Layer>
    </Stage>
  );
};
