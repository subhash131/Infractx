import * as fabric from "fabric";
import { RefObject } from "react";
import useCanvas from "../../store";

export const createMouseHandlers = (
  canvas: fabric.Canvas,
  mode: string,
  isSpacePressed: RefObject<boolean>,
  isPanning: RefObject<boolean>,
  lastPos: RefObject<{ x: number; y: number }>,
  setPan: (pan: { x: number; y: number }) => void
) => {
  const getClientPoint = (e: fabric.TPointerEvent) => {
    if ("clientX" in e) {
      return { x: e.clientX, y: e.clientY };
    }

    if ("touches" in e && e.touches && e.touches.length > 0) {
      const t = e.touches.item(0);
      if (t) return { x: t.clientX, y: t.clientY };
    }

    if (
      "changedTouches" in e &&
      e.changedTouches &&
      e.changedTouches.length > 0
    ) {
      const t = e.changedTouches.item(0);
      if (t) return { x: t.clientX, y: t.clientY };
    }

    return { x: lastPos.current.x, y: lastPos.current.y };
  };

  const handleMouseDown = (
    opt: fabric.TPointerEventInfo<fabric.TPointerEvent>
  ) => {
    const e = opt.e;

    if (mode === "pan" || isSpacePressed.current || e.altKey) {
      const { x, y } = getClientPoint(e);
      isPanning.current = true;
      canvas.selection = false;
      canvas.defaultCursor = "grabbing";
      lastPos.current = { x, y };
    }
  };

  const handleMouseMove = (
    opt: fabric.TPointerEventInfo<fabric.TPointerEvent>
  ) => {
    if (!isPanning.current) return;

    const e = opt.e;
    const { x, y } = getClientPoint(e);
    const vpt = canvas.viewportTransform!;

    vpt[4] += x - lastPos.current.x;
    vpt[5] += y - lastPos.current.y;

    const active = canvas.getActiveObject();
    if (active) active.setCoords();

    canvas.requestRenderAll();
    lastPos.current = { x, y };
    setPan({ x: vpt[4], y: vpt[5] });
  };

  const handleMouseUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      canvas.selection = true;
      canvas.defaultCursor = isSpacePressed.current ? "grab" : "default";
    }
  };

  return { handleMouseDown, handleMouseMove, handleMouseUp };
};
