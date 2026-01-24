// hooks/use-shape-operations.ts
import { useCallback } from "react";
import Konva from "konva";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { calculateOverlap } from "../utils";

interface UseShapeOperationsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeTool: string;
  selectedShapeIds: Id<"shapes">[];
  setActiveShapeId: (id: Id<"shapes"> | undefined) => void;
  setSelectedShapeIds: (ids: Id<"shapes">[]) => void;
  toggleSelectedShapeId: (id: Id<"shapes">) => void;
}

export const useShapeOperations = ({
  stageRef,
  activeTool,
  selectedShapeIds,
  setActiveShapeId,
  setSelectedShapeIds,
  toggleSelectedShapeId,
}: UseShapeOperationsProps) => {
  const updateShape = useMutation(api.design.shapes.updateShape);

  const handleShapeUpdate = useCallback(
    async (e: Konva.KonvaEventObject<DragEvent | Event>, shapeId?: string) => {
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
      node.width(newWidth);
      node.height(newHeight);

      // 4. Send to DB
      console.log("updating shape::", node.id(), node.parent?.id());
      await updateShape({
        shapeId: node.attrs.id || shapeId,
        shapeObject: {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
          // Frame cannot have a parent!
          parentShapeId:
            node.attrs.name === "Frame" ? undefined : node.attrs.parentId,
        },
      });
    },
    [updateShape],
  );

  const handleShapeSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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
        // Shift Key: Toggle Selection (Add/Remove)
        let shapeId = clickedId;
        if (shape.parent?.attrs.type === "GROUP") {
          shapeId = shape.parent.attrs.id;
        }
        toggleSelectedShapeId(shapeId);
        return;
      }

      // Set Active shape
      if (shape?.parent?.attrs.type === "GROUP") {
        setActiveShapeId(shape?.parent?.attrs.id);
        setSelectedShapeIds([shape?.parent?.attrs.id]);
      } else {
        setActiveShapeId(clickedId);
        setSelectedShapeIds([clickedId]);
      }
    },
    [
      activeTool,
      stageRef,
      toggleSelectedShapeId,
      setActiveShapeId,
      setSelectedShapeIds,
    ],
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const draggingNode = e.target;
      e.cancelBubble = true;

      console.log("Dragging::", draggingNode.id(), draggingNode.parent?.id());
      console.log("node:", draggingNode.attrs.name);

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
        if (frameNode.id() === draggingNode.attrs.parentId) return;

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

      console.log(
        "Dragging End::",
        draggingNode.id(),
        draggingNode.parent?.id(),
      );
    },
    [stageRef, selectedShapeIds],
  );

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const clickedId = e.target.attrs.id;
      if (!clickedId) return;

      console.log({ handleDblClick: clickedId });

      const stage = stageRef.current;
      const shape = stage?.findOne(`#${clickedId}`);

      if (shape) {
        // Explicitly select the CHILD ID, ignoring the parent group
        setActiveShapeId(clickedId);
        setSelectedShapeIds([clickedId]);
      }
    },
    [stageRef, setActiveShapeId, setSelectedShapeIds],
  );

  return {
    handleShapeUpdate,
    handleShapeSelect,
    handleDragMove,
    handleDblClick,
  };
};
