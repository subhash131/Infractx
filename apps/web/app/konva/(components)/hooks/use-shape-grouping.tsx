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
  const deleteShapeRecursively = useMutation(
    api.design.shapes.deleteShapeRecursively,
  );
  const deleteShapeById = useMutation(api.design.shapes.deleteShapeById);
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
    setActiveShapeId(undefined);
    setSelectedShapeIds([]);

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
    console.log({ groupShape });

    // Safety checks: Must exist and must be a GROUP
    if (!groupShape || groupShape.attrs.type !== "GROUP") return;

    const children = (groupShape as Konva.Group).getChildren();

    console.log({ children });

    // 3. Move children to the Group's parent (Root or Frame)
    // We adjust X/Y because children were relative to the group, now they become absolute (or relative to frame)
    const updates = children.map((child) => {
      const newParentShapeId = groupShape.attrs.parentShapeId;
      let shapeId = child.id() as Id<"shapes">;
      if (child.attrs.type === "SECTION") {
        const section = (child as Konva.Group)
          .getChildren()
          .filter((child) => child.attrs.type === "SECTION")[0];
        if (section) shapeId = section.id() as Id<"shapes">;
      }

      return updateShape({
        shapeId: shapeId,
        shapeObject: {
          parentShapeId: newParentShapeId ? newParentShapeId : null,
          x: groupShape.x() + child.x(),
          y: groupShape.y() + child.y(),
        },
      });
    });

    await Promise.all(updates);

    // 4. Delete the Group
    await deleteShapeById({ shapeId: groupShape.id() as Id<"shapes"> });
    setActiveShapeId(undefined);
    setSelectedShapeIds([]);
  }, [
    activeShapeId,
    stageRef,
    updateShape,
    deleteShapeRecursively,
    setActiveShapeId,
    setSelectedShapeIds,
  ]);

  return {
    handleGroup,
    handleUngroup,
  };
};
