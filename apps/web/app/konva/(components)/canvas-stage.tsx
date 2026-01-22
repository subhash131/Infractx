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
import { ShapeRenderer } from "./shape-render";
import { useKeyboardControls } from "./hooks/use-keyboard-controls";
import { buildShapeTree, calculateOverlap } from "./utils";
import { ShapeNode } from "./types";

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
  const createShape = useMutation(api.design.shapes.createShape);

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
    if (!nodeType || !nodeId) return;

    const updateAbleNode: boolean =
      nodeType === "RECT" || nodeType === "CIRCLE" || nodeType === "GROUP";

    if (!updateAbleNode) return;

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
    if (shape?.attrs.type === "FRAME") return;

    // 1. Shift Key: Toggle Selection (Add/Remove)
    if (e.evt.shiftKey) {
      toggleSelectedShapeId(clickedId);
      return;
    }

    // 2. New Selection (Exclusive)
    // Only reset if clicking something totally new
    setSelectedShapeIds([clickedId]);

    // 3. Set Active shape

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

    if (selectedShapeIds.length > 0) {
      const nodes = selectedShapeIds
        .map(
          (id) => stage.findOne(`#${id}`) || stage.findOne(`.frame-rect-${id}`),
        )
        .filter((node): node is Konva.Node => node !== undefined);

      transformer.nodes(nodes);
      transformer.getLayer()?.batchDraw();
      return;
    }

    if (activeShapeId) {
      const node =
        stage.findOne(`#${activeShapeId}`) ||
        stage.findOne(`.frame-rect-${activeShapeId}`);
      if (node) {
        transformer.nodes([node]);
      } else {
        transformer.nodes([]);
      }
      transformer.getLayer()?.batchDraw();
      return;
    }

    // 3. Clear Selection
    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedShapeIds, activeShapeId]);

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

  const handleGroup = async () => {
    // 1. Validation: Need at least 2 shapes to group
    if (selectedShapeIds.length < 2 || !shapes) return;

    const selectedShapes = shapes.filter((s) =>
      selectedShapeIds.includes(s._id),
    );
    if (selectedShapes.length === 0) return;

    // 2. Calculate Bounding Box of selection
    let minX = Infinity;
    let minY = Infinity;

    selectedShapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
    });

    // 3. Create the Group container at top-left of selection
    const group = await createShape({
      shapeObject: {
        type: "GROUP",
        pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
        x: minX,
        y: minY,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        text: "",
        fill: "",
        stroke: "",
        strokeWidth: 0,
        name: "Group",
      },
    });

    // 4. Move children into group (Absolute -> Relative coords)
    const updates = selectedShapes.map((shape) =>
      updateShape({
        shapeId: shape._id,
        shapeObject: {
          parentShapeId: group._id,
          x: shape.x - minX,
          y: shape.y - minY, // Make relative to group
        },
      }),
    );

    await Promise.all(updates);

    // 5. Select the new Group
    setSelectedShapeIds([group._id]);
    setActiveShapeId(group._id);
  };

  const handleUngroup = async () => {
    const stage = stageRef.current;
    // 1. Get the group object directly from your data using activeShapeId
    const groupShape = stage?.findOne(`#${activeShapeId}`);

    // Safety checks: Must exist and must be a GROUP
    if (!groupShape || groupShape.attrs.type !== "GROUP") return;

    // 2. Find the children of THIS group
    const hasChildren = groupShape.hasChildren();
    if (!hasChildren) return;
    const children = (groupShape as Konva.Group).children;
    console.log({ children });

    // 3. Move children to the Group's parent (Root or Frame)
    // We adjust X/Y because children were relative to the group, now they become absolute (or relative to frame)
    const updates = children.map((child) => {
      const newParentId = groupShape.parent?.attrs.id;
      return updateShape({
        shapeId: child.attrs.id as Id<"shapes">,
        shapeObject: {
          parentShapeId: newParentId ? newParentId : null,
          x: groupShape.x() + child.x(),
          y: groupShape.y() + child.y(),
        },
      });
    });

    await Promise.all(updates);

    // 4. Delete the Group
    await deleteShape({ shapeIds: [groupShape.attrs.id] });
  };

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

    console.log({ draggingNode });
    if (!draggingNode.attrs.type) return; // Avoid system shapes like transformer
    if (selectedShapeIds.length > 1) return;

    const stage = stageRef.current;
    if (!stage) return;

    const frames = stage.find((node: Konva.Node) => {
      return node.name() && node.name().startsWith("frame-rect-");
    });

    let highlightNode: string | null = null;
    let parentId: string | null = null;
    let bestOverlap = 0;
    let targetFrameRect: Konva.Node | null = null;

    frames.forEach((frameNode) => {
      // Don't check against self if the dragged node happens to be a frame
      if (frameNode.parent?.id() === draggingNode.id()) return;

      const overlap = calculateOverlap(draggingNode, frameNode);

      // Check threshold > 70%
      if (overlap > 70 && overlap > bestOverlap) {
        bestOverlap = overlap;
        highlightNode = frameNode.attrs.id;
        parentId = frameNode.attrs.id;
        targetFrameRect = frameNode;
      } else if (overlap < 20 && bestOverlap < 70) {
        // Only set to remove from frame if no good frame match exists
        highlightNode = draggingNode.attrs.id;
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

    if (highlightNode) {
      // if (activeShapeId !== highlightNode) setActiveShapeId(highlightNode);
    }
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
