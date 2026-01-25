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
  const deleteShapeById = useMutation(api.design.shapes.deleteShapeById);
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
      console.log("updating shape::", node);

      if (
        node.attrs.type === "GROUP" &&
        (node as Konva.Group).children.length <= 1
      ) {
        await deleteShapeById({ shapeId: node.id() as Id<"shapes"> });
      }

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
            node.attrs.name === "Frame"
              ? undefined
              : node.attrs.parentShapeId
                ? node.attrs.parentShapeId
                : null, // if not parent
        },
      });
      // clear transformer to avoid incorrect selection of shapes..!
      setActiveShapeId(undefined);
      setSelectedShapeIds([]);
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

      if (clickedNode.attrs.type === "FRAME" && isMultiSelect) return; // avoid frame multiselect
      if (clickedNode.attrs.name === "frame") return; //avoid frame outer group select

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
        console.log({ targetNode });
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
      e.cancelBubble = true;
      const draggingNode = getTopMostGroup(e.target);

      // 1. Basic Validation
      if (!draggingNode.attrs.type) return;
      if (selectedShapeIds.length > 1) return;
      if (
        draggingNode.parent?.attrs.type &&
        draggingNode.parent?.attrs.type !== "FRAME"
      )
        return;

      const stage = stageRef.current;
      if (!stage) return;

      // 2. Find all Frames
      const frames = stage.find((node: Konva.Node) => {
        return node.name() && node.name().startsWith("frame-rect-");
      });

      // 3. Find the SINGLE BEST overlap candidate
      let bestFrame: Konva.Node | null = null;
      let maxOverlap = 0;

      frames.forEach((frameNode: Konva.Node) => {
        const overlap = calculateOverlap(draggingNode, frameNode);
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestFrame = frameNode;
        }
      });

      if (!bestFrame) return;

      // 4. Determine Action
      const currentParentId = draggingNode.attrs.parentShapeId;
      const bestFrameId = (bestFrame as Konva.Node)?.id() ?? null;

      // CASE A: Move INTO a new frame
      if (bestFrame && maxOverlap > 70) {
        if (currentParentId !== bestFrameId) {
          const targetFrameGroup = (bestFrame as Konva.Node).parent;
          if (targetFrameGroup) {
            const absolutePos = draggingNode.getAbsolutePosition();
            draggingNode.moveTo(targetFrameGroup);
            draggingNode.absolutePosition(absolutePos);
            draggingNode.setAttrs({
              ...draggingNode.attrs,
              parentShapeId: bestFrameId,
            });
          }
        }
      }
      // CASE B: Move OUT to Layer
      else if (currentParentId && maxOverlap < 20) {
        const layer = draggingNode.getLayer();
        if (layer) {
          const absolutePos = draggingNode.getAbsolutePosition();
          draggingNode.moveTo(layer);
          draggingNode.absolutePosition(absolutePos);
          draggingNode.setAttrs({
            ...draggingNode.attrs,
            parentShapeId: null,
          });
          console.log("Moved shape out to Layer");
        }
      }
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
      if (clickedNode.attrs.type === "SECTION" && parent)
        parent = parent?.getParent();

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
