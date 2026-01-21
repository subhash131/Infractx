import { useEffect, useRef } from "react";
import Konva from "konva";
import { debounce } from "lodash";
import { Id } from "@workspace/backend/_generated/dataModel";
import useCanvas from "../store";

interface UseKeyboardControlsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeShapeId: Id<"shapes"> | undefined;
  onDelete: (shapeId: Id<"shapes">[]) => void;
  onUpdate: (
    shapeId: Id<"shapes">,
    updates: { x?: number; y?: number },
  ) => void;
  onDeselect: () => void;
}

export const useKeyboardControls = ({
  stageRef,
  activeShapeId,
  onDelete,
  onUpdate,
  onDeselect,
}: UseKeyboardControlsProps) => {
  const onUpdateRef = useRef(onUpdate);
  const { selectedShapeIds } = useCanvas();

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const debouncedUpdate = useRef(
    debounce((shapeId: Id<"shapes">, updates: { x: number; y: number }) => {
      onUpdateRef.current(shapeId, updates);
    }, 1000),
  ).current;

  useEffect(() => {
    return () => debouncedUpdate.cancel();
  }, [debouncedUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeShapeId) return;

      const stage = stageRef.current;
      if (!stage) return;

      let activeShape = stage.findOne(`#${activeShapeId}`);
      if (!activeShape) return;

      if (activeShape.attrs.type === "FRAME") {
        if (activeShape.parent?.parent) activeShape = activeShape.parent.parent;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        debouncedUpdate.cancel();

        const idsToDelete =
          selectedShapeIds.length > 0
            ? selectedShapeIds
            : activeShapeId
              ? [activeShapeId]
              : [];

        if (idsToDelete.length > 0) {
          onDelete(idsToDelete);
        }

        onDeselect();
        return;
      }

      const moveAmount = e.shiftKey ? 10 : 1;
      let x = activeShape.x();
      let y = activeShape.y();

      if (e.key === "ArrowUp") y -= moveAmount;
      else if (e.key === "ArrowDown") y += moveAmount;
      else if (e.key === "ArrowLeft") x -= moveAmount;
      else if (e.key === "ArrowRight") x += moveAmount;
      else return;

      e.preventDefault();

      activeShape.position({ x, y });
      activeShape.getLayer()?.batchDraw();
      debouncedUpdate(activeShapeId, { x, y });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeShapeId, onDelete, onDeselect, stageRef, debouncedUpdate]);
};
