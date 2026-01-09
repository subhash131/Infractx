import * as fabric from "fabric";
import { RefObject } from "react";

const getTouchDistance = (touch1: Touch, touch2: Touch) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTouchCenter = (touch1: Touch, touch2: Touch) => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
};

export const createTouchHandlers = (
  canvas: fabric.Canvas,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  initialPinchDistance: RefObject<number | null>,
  initialZoom: RefObject<number>,
  lastPos: RefObject<{ x: number; y: number }>,
  setZoom: (zoom: number) => void,
  setPan: (pan: { x: number; y: number }) => void
) => {
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || !touch2) return;

      initialPinchDistance.current = getTouchDistance(touch1, touch2);
      initialZoom.current = canvas.getZoom();

      const center = getTouchCenter(touch1, touch2);
      lastPos.current = center;
      canvas.selection = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || !touch2) return;

      // Pinch Zoom
      const currentDistance = getTouchDistance(touch1, touch2);
      if (initialPinchDistance.current) {
        const scale = currentDistance / initialPinchDistance.current;
        let newZoom = initialZoom.current * scale;

        if (newZoom > 20) newZoom = 20;
        if (newZoom < 0.1) newZoom = 0.1;

        const center = getTouchCenter(touch1, touch2);
        const rect = canvasRef.current!.getBoundingClientRect();
        const point = new fabric.Point(
          center.x - rect.left,
          center.y - rect.top
        );

        canvas.zoomToPoint(point, newZoom);
        setZoom(newZoom);
      }

      // 2-Finger Pan
      const center = getTouchCenter(touch1, touch2);
      const vpt = canvas.viewportTransform!;
      vpt[4] += center.x - lastPos.current.x;
      vpt[5] += center.y - lastPos.current.y;

      const active = canvas.getActiveObject();
      if (active) active.setCoords();

      canvas.requestRenderAll();
      lastPos.current = center;
      setPan({ x: vpt[4], y: vpt[5] });
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistance.current = null;
      canvas.selection = true;
    }
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
};
