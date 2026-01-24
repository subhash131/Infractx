import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import Konva from "konva";

interface UseShapeGroupingProps {
  selectedShapeIds: Id<"shapes">[];
  shapes: Doc<"shapes">[] | undefined;
  activeShapeId: Id<"shapes"> | undefined;
  stageRef: React.RefObject<Konva.Stage | null>;
  setSelectedShapeIds: (ids: Id<"shapes">[]) => void;
  setActiveShapeId: (id: Id<"shapes"> | undefined) => void;
}

export const useShapeGrouping = ({
  selectedShapeIds,
  shapes,
  activeShapeId,
  stageRef,
  setSelectedShapeIds,
  setActiveShapeId,
}: UseShapeGroupingProps) => {
  const updateShape = useMutation(api.design.shapes.updateShape);
  const deleteShape = useMutation(api.design.shapes.deleteShape);
  const createShape = useMutation(api.design.shapes.createShape);

  const handleGroup = useCallback(async () => {
    // 1. Validation: Need at least 2 shapes to group
    if (selectedShapeIds.length < 2 || !shapes) return;

    const selectedShapes = shapes.filter((s) =>
      selectedShapeIds.includes(s._id),
    );
    if (selectedShapes.length === 0) return;

    // 2. Calculate Bounding Box of selection
    let minX = Infinity;
    let minY = Infinity;
    let parentShapeId = null;

    selectedShapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      parentShapeId = s.parentShapeId;
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
        parentShapeId,
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

    // Update both states in a synchronous manner
    setActiveShapeId(undefined);
    setSelectedShapeIds([]);
  }, [
    selectedShapeIds,
    shapes,
    createShape,
    updateShape,
    setActiveShapeId,
    setSelectedShapeIds,
  ]);

  const handleUngroup = useCallback(async () => {
    const stage = stageRef.current;

    // 1. Get the group object directly from your data using activeShapeId
    const groupShape = stage?.findOne(`#${activeShapeId}`);

    // Safety checks: Must exist and must be a GROUP
    if (!groupShape || groupShape.attrs.type !== "GROUP") return;

    // 2. Find the children of THIS group
    const hasChildren = groupShape.hasChildren();
    if (!hasChildren) return;

    const children = (groupShape as Konva.Group).children;

    // Store child IDs before ungrouping
    const childIds = children.map((child) => child.attrs.id as Id<"shapes">);

    // 3. Move children to the Group's parent (Root or Frame)
    // We adjust X/Y because children were relative to the group, now they become absolute (or relative to frame)
    const updates = children.map((child) => {
      const newParentShapeId = groupShape.attrs.parentShapeId;

      return updateShape({
        shapeId: child.attrs.id as Id<"shapes">,
        shapeObject: {
          parentShapeId: newParentShapeId ? newParentShapeId : null,
          x: groupShape.x() + child.x(),
          y: groupShape.y() + child.y(),
        },
      });
    });

    await Promise.all(updates);

    // 4. Delete the Group
    await deleteShape({ shapeIds: [groupShape.attrs.id] });

    // 5. Select the ungrouped children - Batch state updates
    setActiveShapeId(undefined);
    setSelectedShapeIds(childIds);
  }, [
    activeShapeId,
    stageRef,
    updateShape,
    deleteShape,
    setActiveShapeId,
    setSelectedShapeIds,
  ]);

  return {
    handleGroup,
    handleUngroup,
  };
};
