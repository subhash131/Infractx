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

      // Prevent dragging a Frame into a Section (optional safety check based on your rules)
      if (draggingNode.attrs.type === "FRAME") return;

      const stage = stageRef.current;
      if (!stage) return;

      // =========================================================
      // BLOCK A: Find Best Frame (Existing Logic)
      // =========================================================
      const frames = stage.find((node: Konva.Node) => {
        return node.name() && node.name().startsWith("frame-rect-");
      });

      let bestFrame: Konva.Node | null = null;
      let maxFrameOverlap = 0;

      frames.forEach((frameNode: Konva.Node) => {
        const overlap = calculateOverlap(draggingNode, frameNode);
        if (overlap > maxFrameOverlap) {
          maxFrameOverlap = overlap;
          bestFrame = frameNode;
        }
      });

      // =========================================================
      // BLOCK B: Find Best Section (New Logic)
      // =========================================================
      const sections = stage.find((node: Konva.Node) => {
        return node.name() && node.name().startsWith("section-rect-");
      });

      let bestSection: Konva.Node | null = null;
      let maxSectionOverlap = 0;

      sections.forEach((sectionNode: Konva.Node) => {
        // Prevent a section from trying to eat itself or its parents if you drag a Section
        if (draggingNode === sectionNode.parent) return;

        const overlap = calculateOverlap(draggingNode, sectionNode);
        if (overlap > maxSectionOverlap) {
          maxSectionOverlap = overlap;
          bestSection = sectionNode;
        }
      });

      // =========================================================
      // BLOCK C: Resolve Hierarchy (The "Major Problem" Solver)
      // =========================================================

      let finalTargetNode: Konva.Node | null = null;
      let targetType: "FRAME" | "SECTION" | null = null;

      // Thresholds
      const MIN_OVERLAP = 70;

      // 1. Determine who wins: Section or Frame?
      const isFrameValid = bestFrame && maxFrameOverlap > MIN_OVERLAP;
      const isSectionValid = bestSection && maxSectionOverlap > MIN_OVERLAP;

      if (isSectionValid && isFrameValid) {
        // CONFLICT: We are over both a Frame and a Section.
        // Since Sections can be children of Frames, the Section is the "more specific" (deeper) target.
        // Therefore, Section wins.
        finalTargetNode = bestSection;
        targetType = "SECTION";
      } else if (isSectionValid) {
        finalTargetNode = bestSection;
        targetType = "SECTION";
      } else if (isFrameValid) {
        finalTargetNode = bestFrame;
        targetType = "FRAME";
      }

      // =========================================================
      // BLOCK D: Execution (Move Into or Move Out)
      // =========================================================

      const currentParentId = draggingNode.attrs.parentShapeId;

      // CASE 1: Move INTO a Target (Section or Frame)
      if (finalTargetNode) {
        // Get the container group (assuming rect is inside a Group)
        const targetGroup = (finalTargetNode as Konva.Node).parent;
        const targetId = (finalTargetNode as Konva.Node).id(); // Ensure your rects have IDs corresponding to the container

        if (targetGroup && currentParentId !== targetId) {
          const absolutePos = draggingNode.getAbsolutePosition();
          draggingNode.moveTo(targetGroup);
          draggingNode.absolutePosition(absolutePos);
          draggingNode.setAttrs({
            ...draggingNode.attrs,
            parentShapeId: targetId,
          });
          console.log(`Moved into ${targetType}:`, targetId);
        }
      }
      // CASE 2: Move OUT to Layer (Only if no valid target found)
      else if (currentParentId) {
        // Check if we have really left the current parent (overlap < 20)
        // We check overlap against the *current parent* specifically to avoid flickering
        // But simplified: if we found NO finalTargetNode above, we are likely in the 'void' or 'layer' space.

        // Safety check: Don't drop to layer if we simply missed the 70% threshold but are still largely inside.
        // You might want to keep the < 20 check logic here relative to the *current* parent.

        // Find the node object of the current parent to check low overlap
        // (This part is optional if you just want to drop to layer whenever not over a valid target)
        const layer = draggingNode.getLayer();
        if (layer) {
          const absolutePos = draggingNode.getAbsolutePosition();
          draggingNode.moveTo(layer);
          draggingNode.absolutePosition(absolutePos);
          draggingNode.setAttrs({
            ...draggingNode.attrs,
            parentShapeId: null,
          });
          console.log("Moved out to Layer");
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

      // 1. Build Ancestry Path
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

      // 2. Find Active Index (Modified for Sections)
      const activeIndex = ancestryPath.findIndex((node) => {
        // Standard Check: IDs match
        if (node.attrs.id === activeShapeId) return true;

        // Special Check: Section Group
        // If the node is a Section, its Name is "section-{id}", but activeShapeId is just "{id}"
        if (
          node.attrs.type === "SECTION" &&
          activeShapeId &&
          node.attrs.name === `section-${activeShapeId}`
        ) {
          return true;
        }

        return false;
      });

      let nextNodeToSelect: Konva.Node | undefined;

      if (activeIndex !== -1) {
        // CASE 1: We are in the chain (Drill Down)
        if (activeIndex < ancestryPath.length - 1) {
          nextNodeToSelect = ancestryPath[activeIndex + 1];
        } else {
          // At the bottom (Leaf) -> Stay here
          nextNodeToSelect = ancestryPath[activeIndex];
        }
      } else {
        // CASE 2: New selection -> Start at Top
        nextNodeToSelect = ancestryPath[0];
      }

      if (!nextNodeToSelect) return;

      // --- SPECIAL SECTION HANDLING FOR ID EXTRACTION ---
      // If we are about to select a Section Group, we MUST select its ID (from the suffix)
      // or its boundary rect ID, not the Group's ID.
      let nextId = nextNodeToSelect.attrs.id as Id<"shapes">;

      if (nextNodeToSelect.attrs.type === "SECTION") {
        // Extract "123" from "section-123"
        const sectionId = nextNodeToSelect.attrs.name.split(
          "-",
        )[1] as Id<"shapes">;
        nextId = sectionId;
      }

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
