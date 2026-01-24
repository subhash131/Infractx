// hooks/use-shape-operations.ts
import { useCallback } from "react";
import Konva from "konva";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { calculateOverlap, getTopMostGroup } from "../utils";

interface UseShapeOperationsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeTool: string;
  activeShapeId: Id<"shapes"> | undefined;
  selectedShapeIds: Id<"shapes">[];
  setActiveShapeId: (id: Id<"shapes"> | undefined) => void;
  setSelectedShapeIds: (ids: Id<"shapes">[]) => void;
  toggleSelectedShapeId: (id: Id<"shapes">) => void;
}

export const useShapeOperations = ({
  stageRef,
  activeTool,
  activeShapeId,
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
            node.attrs.name === "Frame" ? undefined : node.attrs.parentShapeId,
        },
      });
    },
    [updateShape],
  );

  const handleShapeSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "SELECT") return;

      const stage = stageRef.current;
      const clickedNode = e.target;

      if (!stage || !clickedNode) return;

      // 1. Basic Checks
      const isMultiSelect = e.evt.shiftKey;
      e.cancelBubble = true;

      // Ignore Frames/Backgrounds
      if (clickedNode.attrs.type === "FRAME" && isMultiSelect) return;
      if (clickedNode.attrs.name === "frame") return;

      // 2. Logic for Standard Selection (No Shift)
      if (!isMultiSelect) {
        // CRITICAL FIX: Check if we are clicking inside the currently active group.
        // If activeShapeId is defined, and the clicked node is a descendant of it,
        // we DO NOT want to reset to the top-most group. We want to respect the current depth.
        if (activeShapeId) {
          // Check if the clicked node is the active shape or a child of it

          let current: Konva.Node | null = clickedNode;
          let isClickingInsideActive = false;

          // Traverse up from clicked node to see if we hit the activeShapeId
          while (current && current.nodeType !== "Layer") {
            if (current.attrs.id === activeShapeId) {
              isClickingInsideActive = true;
              break;
            }
            current = current.getParent();
          }

          // If we are clicking within the current selection, STOP here.
          // This allows handleDblClick to take over without interference.
          if (isClickingInsideActive) {
            return;
          }
        }

        // If we are NOT inside the active selection, THEN select the top-most group
        const targetNode = getTopMostGroup(clickedNode);
        const targetId = targetNode.attrs.id as Id<"shapes">;

        setActiveShapeId(targetId);
        setSelectedShapeIds([targetId]);
        return;
      }

      // 3. Logic for Multi-Select (Shift Key) - (Unchanged)
      const targetNode = getTopMostGroup(clickedNode);
      const targetId = targetNode.attrs.id as Id<"shapes">;
      toggleSelectedShapeId(targetId);
    },
    [
      activeTool,
      stageRef,
      toggleSelectedShapeId,
      setActiveShapeId,
      setSelectedShapeIds,
      activeShapeId,
    ],
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const draggingNode = getTopMostGroup(e.target);
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

      let parentShapeId: string | null = null;
      let bestOverlap = 0;
      let targetFrameRect: Konva.Node | null = null;

      frames.forEach((frameNode) => {
        // Don't check against self if the dragged node happens to be a frame
        if (frameNode.parent?.id() === draggingNode.id()) return;
        if (frameNode.id() === draggingNode.attrs.parentShapeId) return;

        const overlap = calculateOverlap(draggingNode, frameNode);
        console.log({ overlap });

        // Check threshold > 70%
        if (overlap > 70 && overlap > bestOverlap) {
          bestOverlap = overlap;
          parentShapeId = frameNode.attrs.id;
          targetFrameRect = frameNode;
        } else if (overlap < 20 && bestOverlap < 70) {
          // Only set to remove from frame if no good frame match exists
          parentShapeId = null;
          targetFrameRect = null;
        }
      });

      // Handle reparenting with position transformation
      if (parentShapeId && targetFrameRect) {
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
            parentShapeId,
          });
        }
      } else if (
        parentShapeId === null &&
        draggingNode.parent?.attrs.name?.startsWith("frame-rect-")
      ) {
        // TODO: Moving out of a frame back to layer
        // if (stage) {
        //   const absolutePos = draggingNode.getAbsolutePosition();
        //   draggingNode.moveTo(stage);
        //   draggingNode.position(absolutePos);
        //   draggingNode.attrs.parentShapeId = null;
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
      const clickedNode = e.target;
      const stage = stageRef.current;
      if (!clickedNode || !stage) return;

      e.cancelBubble = true;

      // Build Ancestry Path
      const ancestryPath: Konva.Node[] = [clickedNode];
      let parent = clickedNode.getParent();

      while (
        parent &&
        parent.nodeType !== "Layer" &&
        parent.nodeType !== "Stage"
      ) {
        ancestryPath.unshift(parent);
        parent = parent.getParent();
      }

      const activeIndex = ancestryPath.findIndex(
        (node) => node.attrs.id === activeShapeId,
      );

      let nextNodeToSelect: Konva.Node | undefined;

      if (activeIndex !== -1) {
        // CASE 1: We are in the chain
        if (activeIndex < ancestryPath.length - 1) {
          // Go deeper
          nextNodeToSelect = ancestryPath[activeIndex + 1];
        } else {
          // We are at the bottom (Leaf node).
          // STAY HERE. Do not jump back to top.
          nextNodeToSelect = ancestryPath[activeIndex];
        }
      } else {
        // CASE 2: Nothing in this chain is selected. Start at top.
        nextNodeToSelect = ancestryPath[0];
      }

      if (!nextNodeToSelect) return;
      const nextId = nextNodeToSelect.attrs.id as Id<"shapes">;

      if (nextId && nextId !== activeShapeId) {
        console.log(`Drilling down: ${activeShapeId} -> ${nextId}`);
        setActiveShapeId(nextId);
        setSelectedShapeIds([nextId]);
      }
    },
    [stageRef, activeShapeId, setActiveShapeId, setSelectedShapeIds],
  );
  return {
    handleShapeUpdate,
    handleShapeSelect,
    handleDragMove,
    handleDblClick,
  };
};
