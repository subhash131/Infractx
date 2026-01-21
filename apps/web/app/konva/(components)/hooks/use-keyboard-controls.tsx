import { useEffect, useRef } from "react";
import Konva from "konva";
import { debounce } from "lodash";
import { Id } from "@workspace/backend/_generated/dataModel";

interface UseKeyboardControlsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeShapeId: Id<"shapes"> | undefined;
  onDelete: (shapeId: Id<"shapes">) => void;
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
  if (!stageRef) return;
  const debouncedUpdate = useRef(
    debounce((shapeId: Id<"shapes">, updates: { x: number; y: number }) => {
      onUpdate(shapeId, updates);
    }, 300),
  ).current;

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeShapeId) return;

      const stage = stageRef.current;
      if (!stage) return;

      const activeShape = stage.findOne(`#${activeShapeId.toString()}`);
      if (!activeShape) return;

      // Delete shape
      if (e.key === "Delete") {
        e.preventDefault();
        debouncedUpdate.cancel();
        onDelete(activeShapeId);
        onDeselect();
        return;
      }

      const moveAmount = e.shiftKey ? 10 : 1;
      let newX = activeShape.x();
      let newY = activeShape.y();

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newY -= moveAmount;
          break;
        case "ArrowDown":
          e.preventDefault();
          newY += moveAmount;
          break;
        case "ArrowLeft":
          e.preventDefault();
          newX -= moveAmount;
          break;
        case "ArrowRight":
          e.preventDefault();
          newX += moveAmount;
          break;
        default:
          return;
      }

      // Update position locally (instant visual feedback)
      activeShape.position({ x: newX, y: newY });
      activeShape.getLayer()?.batchDraw();

      // Debounced database update
      debouncedUpdate(activeShapeId, { x: newX, y: newY });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeShapeId, onDelete, onDeselect, stageRef, debouncedUpdate]);
};
