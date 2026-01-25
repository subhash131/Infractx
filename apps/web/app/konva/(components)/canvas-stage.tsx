"use client";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";
import { GridPattern } from "./grid-pattern";
import { ShapePreview } from "./shape-preview";

import { useSmoothCanvasZoom } from "./hooks/use-canvas-zoom";
import { useShapeDrawing } from "./hooks/use-shape-drawing";
import useCanvas from "./store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ShapeRenderer } from "./shape-renderer";
import { useKeyboardControls } from "./hooks/use-keyboard-controls";
import { buildShapeTree } from "./utils";
import { ShapeNode } from "./types";

import { useShapeGrouping } from "./hooks/use-shape-grouping";
import { useShapeOperations } from "./hooks/use-shape-operations";
import { CanvasTransformer } from "./canvas-transformer";

export const CanvasStage: React.FC = () => {
  const {
    activeTool,
    setActiveShapeId,
    activeShapeId,
    selectedShapeIds,
    setSelectedShapeIds,
    toggleSelectedShapeId,
  } = useCanvas();
  const [activeTree, setActiveTree] = useState<ShapeNode[]>([]);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { handleWheel } = useSmoothCanvasZoom(stageRef);

  const { newShape, handlePointerDown, handlePointerMove, handleMouseUp } =
    useShapeDrawing();

  const shapes = useQuery(api.design.shapes.getShapesByPage, {
    pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
  });
  const updateShape = useMutation(api.design.shapes.updateShape);
  const deleteShapeRecursively = useMutation(
    api.design.shapes.deleteShapeRecursively,
  );

  const { handleGroup, handleUngroup } = useShapeGrouping({
    activeShapeId,
    selectedShapeIds,
    setActiveShapeId,
    setSelectedShapeIds,
    shapes,
    stageRef,
    pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
  });
  const {
    handleShapeUpdate,
    handleShapeSelect,
    handleDragMove,
    handleDblClick,
  } = useShapeOperations({
    stageRef,
    activeTool,
    activeShapeId,
    selectedShapeIds,
    setActiveShapeId,
    setSelectedShapeIds,
    toggleSelectedShapeId,
  });

  useEffect(() => {
    if (shapes) {
      const tree = buildShapeTree(shapes);
      setActiveTree(tree);
    }
  }, [shapes]);

  const handleTextChange = async (shapeId: string, newText: string) => {
    await updateShape({
      shapeId: shapeId as Id<"shapes">,
      shapeObject: {
        text: newText,
      },
    });
  };

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    // Determine which IDs to transform (priority: selectedShapeIds > activeShapeId)
    const idsToTransform =
      selectedShapeIds.length > 0
        ? selectedShapeIds
        : activeShapeId
          ? [activeShapeId]
          : [];

    // Clear transformer if nothing selected
    if (idsToTransform.length === 0) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    // Find and attach nodes
    const nodes = idsToTransform
      .map(
        (id) => stage.findOne(`#${id}`) || stage.findOne(`.frame-rect-${id}`),
      )
      .filter((node): node is Konva.Node => node !== undefined);

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedShapeIds, activeShapeId]);

  useKeyboardControls({
    stageRef,
    activeShapeId,
    onDelete: async (selectedShapeIds) =>
      await deleteShapeRecursively({ shapeIds: selectedShapeIds }),
    onUpdate: (shapeId, updates) =>
      updateShape({ shapeId, shapeObject: updates }),
    onDeselect: () => setActiveShapeId(undefined),
    onGroup: handleGroup,
    onUngroup: handleUngroup,
  });

  useEffect(() => {
    if (stageRef.current) {
      // load from DB
      stageRef.current.position({ x: 100, y: 100 });
      stageRef.current.scale({ x: 0.3, y: 0.3 });
    }
  }, []);

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
      draggable={activeTool === "SELECT"}
      style={{ background: "#1E1E1E" }}
      onDragMove={handleDragMove}
    >
      <Layer>
        <GridPattern />
        {activeTree.map((node) => (
          <ShapeRenderer
            key={node._id}
            shape={node}
            activeTool={activeTool}
            activeShapeId={activeShapeId}
            handleShapeUpdate={handleShapeUpdate}
            handleShapeSelect={handleShapeSelect}
            handleTextChange={handleTextChange}
            handleDblClick={handleDblClick}
          />
        ))}

        {newShape && <ShapePreview shape={newShape} />}
        {activeShapeId && <CanvasTransformer transformerRef={transformerRef} />}
      </Layer>
    </Stage>
  );
};
