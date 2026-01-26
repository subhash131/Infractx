import { useCallback } from "react";
import Konva from "konva";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import {
  calculateOverlap,
  checkActiveNode,
  getContainer,
  getTopMostGroup,
} from "../utils";
import {
  getGuides,
  getObjectSnappingEdges,
  drawGuides,
} from "../frame-snapping-util";
import useCanvas from "../store";

interface UseShapeOperationsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const useShapeOperations = ({ stageRef }: UseShapeOperationsProps) => {
  const updateShape = useMutation(api.design.shapes.updateShape);
  const deleteShapeById = useMutation(api.design.shapes.deleteShapeById);
  const {
    activeTool,
    selectedShapeIds,
    setActiveShapeId,
    setSelectedShapeIds,
    toggleSelectedShapeId,
    activeShapeId,
  } = useCanvas();

  // Helper to clear guides
  const clearGuides = useCallback((layer: Konva.Layer) => {
    layer.find(".guid-line").forEach((l) => l.destroy());
  }, []);

  // --- 1. HANDLE SHAPE UPDATE (Resize/Transform End) ---
  const handleShapeUpdate = useCallback(
    async (
      e: Konva.KonvaEventObject<DragEvent | Event>,
      shapeId?: Id<"shapes">,
    ) => {
      const node = e.target;
      if (!node) return;

      const nodeType: Doc<"shapes">["type"] = node.attrs.type;
      const nodeId: Id<"shapes"> = node.attrs.id;
      if (!shapeId && (!nodeType || !nodeId)) return;

      e.cancelBubble = true;

      // Reset scale to 1 and adjust width/height
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const newWidth = Math.max(5, node.width() * scaleX);
      const newHeight = Math.max(5, node.height() * scaleY);

      node.width(newWidth);
      node.height(newHeight);

      // Clean up empty groups
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
          parentShapeId:
            node.attrs.name === "Frame"
              ? undefined
              : node.attrs.parentShapeId || null,
          radius: node instanceof Konva.Circle ? node.radius() : undefined,
        },
      });

      // Cleanup UI states
      setActiveShapeId(undefined);
      setSelectedShapeIds([]);

      // Clear snapping guides if any remain
      const layer = node.getLayer();
      if (layer) clearGuides(layer);
    },
    [
      updateShape,
      setActiveShapeId,
      setSelectedShapeIds,
      deleteShapeById,
      clearGuides,
    ],
  );

  // --- 2. HANDLE SELECTION (Single & Double Click) ---
  const handleShapeSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== "SELECT") return;

      const stage = stageRef.current;
      const clickedNode = e.target;
      if (!stage || !clickedNode) return;

      const isMultiSelect = e.evt.shiftKey;
      e.cancelBubble = true;

      if (clickedNode.attrs.type === "FRAME" && isMultiSelect) return;
      if (clickedNode.attrs.name === "frame") return;

      // Standard Selection
      if (!isMultiSelect) {
        if (activeShapeId) {
          // Check if clicking inside active group to allow drill-down
          let current: Konva.Node | null = clickedNode;
          let isClickingInsideActive = false;
          while (current && current.nodeType !== "Layer") {
            if (current.attrs.id === activeShapeId) {
              isClickingInsideActive = true;
              break;
            }
            current = current.getParent();
          }
          if (isClickingInsideActive) return;
        }

        const targetNode = getTopMostGroup(clickedNode);
        const targetId = targetNode.attrs.id as Id<"shapes">;
        setActiveShapeId(targetId);
        setSelectedShapeIds([targetId]);
        return;
      }

      // Multi-Select
      const targetNode = getTopMostGroup(clickedNode);
      const targetId = targetNode.attrs.id as Id<"shapes">;
      toggleSelectedShapeId(targetId);
    },
    [
      activeTool,
      stageRef,
      activeShapeId,
      setActiveShapeId,
      setSelectedShapeIds,
      toggleSelectedShapeId,
    ],
  );

  // --- 3. HANDLE DRAG MOVE (Snapping + Reparenting) ---
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      // Get the actual movable node (Group or Shape)

      const target = e.target;
      const isIndependentShape =
        target.attrs.type === "RECT" ||
        target.attrs.type === "CIRCLE" ||
        target.attrs.type === "TEXT";

      const draggingNode = isIndependentShape
        ? target
        : getTopMostGroup(target);

      if (!draggingNode.attrs.type || draggingNode.attrs.type === "FRAME")
        return;
      if (selectedShapeIds.length > 1) return;

      const stage = stageRef.current;
      const layer = draggingNode.getLayer();
      if (!stage || !layer) return;

      // =========================================================
      // PART A: SNAPPING LOGIC
      // =========================================================
      const shouldSnap =
        activeShapeId && checkActiveNode(draggingNode).id() === activeShapeId;

      if (shouldSnap) {
        clearGuides(layer);

        // Find candidates for snapping (Frames, Sections, other Shapes)
        // Exclude self, children, and parents
        const snappingScope = getContainer(draggingNode);
        if (snappingScope instanceof Konva.Group) {
          const snapCandidates = (snappingScope as Konva.Group).find(
            (n: Konva.Node) => {
              const type = n.attrs.type;
              const isCandidateType =
                type === "FRAME" ||
                type === "SECTION" ||
                type === "RECT" ||
                type === "CIRCLE";
              const isSelfOrRelated =
                n === draggingNode ||
                n.isAncestorOf(draggingNode) ||
                draggingNode.isAncestorOf(n);
              return isCandidateType && !isSelfOrRelated;
            },
          );

          const vertical: number[] = [];
          const horizontal: number[] = [];

          snapCandidates.forEach((node) => {
            const box = node.getClientRect({ relativeTo: layer });
            vertical.push(box.x, box.x + box.width, box.x + box.width / 2);
            horizontal.push(box.y, box.y + box.height, box.y + box.height / 2);
          });

          const itemBounds = getObjectSnappingEdges(draggingNode);
          if (itemBounds) {
            const guides = getGuides(
              { vertical, horizontal },
              itemBounds,
              stage.scaleX(),
            );

            if (guides.length) {
              let snapBounds = undefined;
              const containerNode = getContainer(draggingNode);
              console.log({ containerNode });
              if (
                containerNode !== draggingNode &&
                containerNode.attrs.name === "frame"
              ) {
                snapBounds = containerNode.getClientRect({ relativeTo: layer });
                console.log({ snapBounds });
              }
              drawGuides(guides, layer, undefined, snapBounds);

              // Apply Snapping (Position Correction)
              const currentAbsPos = draggingNode.getAbsolutePosition();
              const currentClientRect = draggingNode.getClientRect({
                relativeTo: layer,
              });
              const anchorOffsetX = currentAbsPos.x - currentClientRect.x;
              const anchorOffsetY = currentAbsPos.y - currentClientRect.y;

              const newPos = { x: currentAbsPos.x, y: currentAbsPos.y };

              guides.forEach((lg) => {
                if (lg.orientation === "V") {
                  newPos.x = lg.lineGuide - lg.offset + anchorOffsetX;
                } else {
                  newPos.y = lg.lineGuide - lg.offset + anchorOffsetY;
                }
              });
              draggingNode.setAbsolutePosition(newPos);
            }
          }
        }
      } else {
        // If we are NOT snapping (e.g. passive drag), ensure old guides are gone
        clearGuides(layer);
      }

      // =========================================================
      // PART B: REPARENTING LOGIC (Using new Snapped Position)
      // =========================================================

      const frames = stage.find((node: Konva.Node) =>
        node.name()?.startsWith("frame-rect-"),
      );
      const sections = stage.find((node: Konva.Node) =>
        node.name()?.startsWith("section-rect-"),
      );

      const currentParentId = draggingNode.attrs.parentShapeId;
      let currentParentBoundary: Konva.Node | undefined;

      // Resolve current parent boundary
      if (currentParentId) {
        currentParentBoundary = [...frames, ...sections].find(
          (n) => n.id() === currentParentId,
        );

        if (!currentParentBoundary) {
          const parentGroup = stage.findOne(`#${currentParentId}`);
          if (parentGroup && parentGroup.getType() === "Group") {
            const suffix = parentGroup.name().split("-")[1] || parentGroup.id();
            currentParentBoundary = (parentGroup as Konva.Group)
              .getChildren()
              .find(
                (child) =>
                  child.name().includes("rect") || child.id() === suffix,
              );
          }
        }
      }

      // Calculate Overlaps
      const calculateBestTarget = (candidates: Konva.Node[]) => {
        let best: Konva.Node | null = null;
        let maxOverlap = 0;
        candidates.forEach((node) => {
          if (draggingNode === node || draggingNode === node.parent) return;
          const overlap = calculateOverlap(draggingNode, node);
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            best = node;
          }
        });
        return { best, maxOverlap };
      };

      const { best: bestSection, maxOverlap: maxSectionOverlap } =
        calculateBestTarget(sections);
      const { best: bestFrame, maxOverlap: maxFrameOverlap } =
        calculateBestTarget(frames);

      // Determine Target
      const ENTER_THRESHOLD = 70;
      const LEAVE_THRESHOLD = 20;
      let potentialTarget: Konva.Node | null = null;
      let targetType: "FRAME" | "SECTION" | null = null;

      if (bestSection && maxSectionOverlap > ENTER_THRESHOLD) {
        potentialTarget = bestSection;
        targetType = "SECTION";
      } else if (bestFrame && maxFrameOverlap > ENTER_THRESHOLD) {
        potentialTarget = bestFrame;
        targetType = "FRAME";
      }

      // Action: Enter
      if (potentialTarget) {
        const newParentId = (potentialTarget as Konva.Node).id();
        if (newParentId !== currentParentId) {
          const targetGroup = (potentialTarget as Konva.Node).parent;
          if (targetGroup) {
            const absPos = draggingNode.getAbsolutePosition();
            draggingNode.moveTo(targetGroup);
            draggingNode.absolutePosition(absPos);
            draggingNode.setAttrs({
              ...draggingNode.attrs,
              parentShapeId: newParentId,
            });
            console.log(`Moved INTO ${targetType}`);
            return;
          }
        }
      }

      // Action: Leave
      if (currentParentBoundary) {
        const currentOverlap = calculateOverlap(
          draggingNode,
          currentParentBoundary,
        );
        if (currentOverlap < LEAVE_THRESHOLD) {
          const layer = draggingNode.getLayer();
          if (layer) {
            const absPos = draggingNode.getAbsolutePosition();
            draggingNode.moveTo(layer);
            draggingNode.absolutePosition(absPos);
            draggingNode.setAttrs({
              ...draggingNode.attrs,
              parentShapeId: null,
            });
            console.log("Moved OUT to Layer");
          }
        }
      } else if (currentParentId && !currentParentBoundary) {
        // Orphan cleanup
        const layer = draggingNode.getLayer();
        if (layer) {
          const absPos = draggingNode.getAbsolutePosition();
          draggingNode.moveTo(layer);
          draggingNode.absolutePosition(absPos);
          draggingNode.setAttrs({ ...draggingNode.attrs, parentShapeId: null });
        }
      }
    },
    [stageRef, selectedShapeIds, clearGuides],
  );

  // --- 4. HANDLE DOUBLE CLICK ---
  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const clickedNode = e.target;
      if (!clickedNode) return;

      e.cancelBubble = true;

      // Build Ancestry
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

      // Find Active Index
      const activeIndex = ancestryPath.findIndex((node) => {
        if (node.attrs.id === activeShapeId) return true;
        // Section Name Check
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
      if (activeIndex !== -1 && activeIndex < ancestryPath.length - 1) {
        nextNodeToSelect = ancestryPath[activeIndex + 1];
      } else {
        nextNodeToSelect = ancestryPath[activeIndex] || ancestryPath[0];
      }

      if (!nextNodeToSelect) return;

      // Extract ID (Handle Section Suffix)
      let nextId = nextNodeToSelect.attrs.id as Id<"shapes">;
      if (nextNodeToSelect.attrs.type === "SECTION") {
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

  const handleDragEnd = useCallback(
    async (e: Konva.KonvaEventObject<DragEvent | Event>) => {
      const node = e.target;
      if (!node) return;

      const nodeType = node.attrs.type;
      const nodeId = node.attrs.id;

      // Basic validation
      if (!nodeType || !nodeId) return;

      e.cancelBubble = true;

      // 1. CLEAR SNAPPING GUIDES
      // Crucial cleanup step after dragging finishes
      const layer = node.getLayer();
      if (layer) clearGuides(layer);

      // 2. NORMALIZE SCALE (Fix transform artifacts)
      // Convert scaleX/Y back to 1 and update width/height explicitly
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const newWidth = Math.max(5, node.width() * scaleX);
      const newHeight = Math.max(5, node.height() * scaleY);

      node.width(newWidth);
      node.height(newHeight);

      // 3. CLEANUP EMPTY GROUPS
      // If a group is left with 1 or 0 children, remove it
      if (
        node.attrs.type === "GROUP" &&
        (node as Konva.Group).children.length <= 1
      ) {
        await deleteShapeById({ shapeId: node.id() as Id<"shapes"> });
      }

      // 4. PERSIST TO DATABASE
      // This saves the position (x, y) and the new parent (parentShapeId)
      // that was set optimistically during handleDragMove.
      console.log("Saving shape update:", node.attrs.id);

      await updateShape({
        shapeId: node.attrs.id,
        shapeObject: {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
          // Read the parent ID that was set during 'handleDragMove'
          parentShapeId:
            node.attrs.name === "Frame"
              ? undefined
              : node.attrs.parentShapeId || null,
        },
      });

      // 5. RESET SELECTION STATE
      setActiveShapeId(undefined);
      setSelectedShapeIds([]);
    },
    [
      updateShape,
      deleteShapeById,
      setActiveShapeId,
      setSelectedShapeIds,
      clearGuides,
    ],
  );

  return {
    handleShapeUpdate, // DragEnd/TransformEnd
    handleShapeSelect, // Click
    handleDragMove, // DragMove (Snap + Reparent)
    handleDblClick, // DblClick
    handleDragEnd,
  };
};
