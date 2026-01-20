import { useState } from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import useCanvas from "../store";
import { createShapeObject } from "../shape-factory";

export type NewShape = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
};

export const useShapeDrawing = () => {
  const { activeTool, setActiveTool, setActiveShapeId } = useCanvas();
  const createShape = useMutation(api.design.shapes.createShape);
  const [newShape, setNewShape] = useState<NewShape | null>(null);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (e.target === e.target.getStage()) {
      setActiveShapeId(undefined);
    }
    if (activeTool === "SELECT") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    switch (activeTool) {
      case "RECT":
      case "FRAME":
        setNewShape({
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          width: 10,
          height: 10,
        });
        break;
      case "CIRCLE":
        setNewShape({
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          radius: 10,
        });
        break;
    }
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (activeTool === "SELECT" || !newShape) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    switch (activeTool) {
      case "RECT":
      case "FRAME":
        setNewShape((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            width: pos.x - prev.startX,
            height: pos.y - prev.startY,
          };
        });
        break;
      case "CIRCLE":
        setNewShape((prev) => {
          if (!prev) return null;
          const radius = Math.sqrt(
            Math.pow(pos.x - prev.startX, 2) + Math.pow(pos.y - prev.startY, 2),
          );
          return {
            ...prev,
            width: radius * 2,
            height: radius * 2,
            radius,
          };
        });
    }
  };

  const handleMouseUp = () => {
    if (!newShape) return;

    const shapeObject = createShapeObject(activeTool, newShape);

    if (shapeObject) {
      createShape({ shapeObject });
    }

    setNewShape(null);
    setActiveTool("SELECT");
  };

  return {
    newShape,
    handlePointerDown,
    handlePointerMove,
    handleMouseUp,
  };
};
