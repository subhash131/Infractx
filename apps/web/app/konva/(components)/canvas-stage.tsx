"use client";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";

import { GridPattern } from "./grid-pattern";
import { ShapePreview } from "./shape-preview";

import { useSmoothCanvasZoom } from "./hooks/use-canvas-zoom";
import { useShapeDrawing } from "./hooks/use-shape-drawing";
import useCanvas from "./store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { ShapeRenderer } from "./shape-renderer";
import { useKeyboardControls } from "./hooks/use-keyboard-controls";
import { buildShapeTree, calculateOverlap } from "./utils";
import { ShapeNode } from "./types";

import { useShapeGrouping } from "./hooks/use-shape-grouping";

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
  const deleteShape = useMutation(api.design.shapes.deleteShape);

  const { handleGroup, handleUngroup } = useShapeGrouping({
    activeShapeId,
    selectedShapeIds,
    setActiveShapeId,
    setSelectedShapeIds,
    shapes,
    stageRef,
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

  const handleShapeUpdate = async (
    e: Konva.KonvaEventObject<DragEvent | Event>,
    shapeId?: string,
  ) => {
    const node = e.target;
    if (!node) return;

    const nodeType: Doc<"shapes">["type"] = node.attrs.type;
    const nodeId: Doc<"shapes">["type"] = node.attrs.id;
    if (!shapeId && (!nodeType || !nodeId)) return;

    console.log("shape update", {
      nodeType,
      nodeId,
      parentNodeId: node.parent?.id(),
    });

    e.cancelBubble = true;

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
    console.log("updating shape::", node.id(), node.parent?.id());
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
        parentShapeId:
          node.attrs.name === "Frame" ? undefined : node.attrs.parentId,
      },
    });
  };

  const handleShapeSelect = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedId = e.target.attrs.id as Id<"shapes">;
    if (activeTool !== "SELECT") return;
    const stage = stageRef.current;
    if (!stage) return;
    const shape = stage.findOne(`#${clickedId}`);
    const isMultiSelect = e.evt.shiftKey;
    if (!shape) return;
    e.cancelBubble = true;

    if (shape?.attrs.type === "FRAME" && isMultiSelect) return;
    if (shape?.attrs.name === "frame") return;
    if (e.evt.shiftKey) {
      // 1. Shift Key: Toggle Selection (Add/Remove)
      let shapeId = clickedId;
      if (shape.parent?.attrs.type === "GROUP") {
        shapeId = shape.parent.attrs.id;
      }
      toggleSelectedShapeId(shapeId);
      return;
    }

    // 2. Set Active shape
    if (shape?.parent?.attrs.type === "GROUP") {
      setActiveShapeId(shape?.parent?.attrs.id);
      setSelectedShapeIds([shape?.parent?.attrs.id]);
    } else {
      setActiveShapeId(clickedId);
      setSelectedShapeIds([clickedId]);
    }
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
      await deleteShape({ shapeIds: selectedShapeIds }),
    onUpdate: (shapeId, updates) =>
      updateShape({ shapeId, shapeObject: updates }),
    onDeselect: () => setActiveShapeId(undefined),
    onGroup: handleGroup,
    onUngroup: handleUngroup,
  });
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const draggingNode = e.target;
    e.cancelBubble = true;

    console.log("Dragging::", draggingNode.id(), draggingNode.parent?.id());
    if (!draggingNode.attrs.type) return; // Avoid system shapes like transformer
    if (selectedShapeIds.length > 1) return;
    if (
      draggingNode.parent?.attrs.type &&
      draggingNode.parent?.attrs.type !== "FRAME"
    )
      return;

    const stage = stageRef.current;
    if (!stage) return;

    const frames = stage.find((node: Konva.Node) => {
      return node.name() && node.name().startsWith("frame-rect-");
    });

    let parentId: string | null = null;
    let bestOverlap = 0;
    let targetFrameRect: Konva.Node | null = null;

    frames.forEach((frameNode) => {
      // Don't check against self if the dragged node happens to be a frame
      if (frameNode.parent?.id() === draggingNode.id()) return;

      const overlap = calculateOverlap(draggingNode, frameNode);
      console.log({ overlap });

      // Check threshold > 70%
      if (overlap > 70 && overlap > bestOverlap) {
        bestOverlap = overlap;
        parentId = frameNode.attrs.id;
        targetFrameRect = frameNode;
      } else if (overlap < 20 && bestOverlap < 70) {
        // Only set to remove from frame if no good frame match exists
        parentId = null;
        targetFrameRect = null;
      }
    });
    // Handle reparenting with position transformation
    if (parentId && targetFrameRect) {
      // Get the parent Group of the frame rectangle
      const targetFrameGroup = (targetFrameRect as Konva.Node).parent;

      if (targetFrameGroup && draggingNode.parent !== targetFrameGroup) {
        // Moving into a frame
        const absolutePos = draggingNode.getAbsolutePosition();
        draggingNode.moveTo(targetFrameGroup);
        const frameGroupPos = targetFrameGroup.getAbsolutePosition();
        draggingNode.position({
          x: absolutePos.x - frameGroupPos.x,
          y: absolutePos.y - frameGroupPos.y,
        });
        draggingNode.setAttrs({
          ...draggingNode.attrs,
          parentId,
        });
      }
    } else if (
      parentId === null &&
      draggingNode.parent?.attrs.name?.startsWith("frame-rect-")
    ) {
      // TODO: Moving out of a frame back to layer
      // if (stage) {
      //   const absolutePos = draggingNode.getAbsolutePosition();
      //   draggingNode.moveTo(stage);
      //   draggingNode.position(absolutePos);
      //   draggingNode.attrs.parentId = null;
      // }
    }
    console.log("Dragging End::", draggingNode.id(), draggingNode.parent?.id());
  };

  useEffect(() => {
    if (stageRef.current) {
      // load from DB
      stageRef.current.position({ x: 100, y: 100 });
      stageRef.current.scale({ x: 0.3, y: 0.3 });
    }
  }, []);

  const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedId = e.target.attrs.id;
    if (!clickedId) return;
    console.log({ handleDblClick: clickedId });

    // 1. Check if we clicked a valid shape
    const stage = stageRef.current;
    const shape = stage?.findOne(`#${clickedId}`);

    if (shape) {
      // 2. Explicitly select the CHILD ID, ignoring the parent group
      setActiveShapeId(clickedId);
      setSelectedShapeIds([clickedId]);
    }
  };

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
            draggable={false}
            anchorStyleFunc={(anchor) => {
              // 1. Get the node this transformer is attached to
              // anchor.getParent() is the Transformer itself
              const transformer = anchor.getParent();
              if (!transformer) return;
              const node = (transformer as any).nodes()[0];
              if (!node) return;

              // 2. Check if the attached node is a Circle
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
