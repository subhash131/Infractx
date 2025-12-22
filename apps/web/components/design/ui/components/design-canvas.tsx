import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import useCanvas from "../../store";

export const DesignCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { canvas, setCanvas, setDevicePixelRatio, setZoom, setPan, mode } =
    useCanvas();
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef(1);

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      console.log("Initializing canvas...");

      const dpr = window.devicePixelRatio || 1;
      setDevicePixelRatio(dpr);

      canvasRef.current.style.width = window.innerWidth + "px";
      canvasRef.current.style.height = window.innerHeight + "px";

      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: window.innerWidth * dpr,
        height: window.innerHeight * dpr,
        allowTouchScrolling: true,
        enableRetinaScaling: true,
        imageSmoothingEnabled: true,
        selectionBorderColor: "#4096ee",
        selectionLineWidth: 2,
      });

      setCanvas(initCanvas);
      initCanvas.renderAll();

      // ======= MOUSE WHEEL: ZOOM with Ctrl/Cmd, PAN without =======
      const handleWheel = (opt: any) => {
        const e = opt.e;
        e.preventDefault();
        e.stopPropagation();

        const vpt = initCanvas.viewportTransform!;

        // ZOOM: Ctrl/Cmd + Wheel
        if (e.ctrlKey || e.metaKey) {
          const delta = e.deltaY;
          let zoom = initCanvas.getZoom();
          zoom *= 0.999 ** delta;

          if (zoom > 20) zoom = 20;
          if (zoom < 0.1) zoom = 0.1;

          initCanvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
          setZoom(zoom);
        }
        // PAN: Plain wheel or trackpad scroll
        else {
          // Vertical scroll (up/down)
          vpt[5] -= e.deltaY;

          // Horizontal scroll (left/right) - works with trackpad shift+scroll or horizontal scroll
          vpt[4] -= e.deltaX;

          initCanvas.requestRenderAll();
          setPan({ x: vpt[4], y: vpt[5] });
        }
      };

      // ======= MOUSE DOWN =======
      const handleMouseDown = (opt: any) => {
        const e = opt.e;

        if (mode === "pan" || isSpacePressed.current || e.altKey) {
          isPanning.current = true;
          initCanvas.selection = false;
          initCanvas.defaultCursor = "grabbing";
          lastPos.current = { x: e.clientX, y: e.clientY };
        }
      };

      // ======= MOUSE MOVE (Drag Pan) =======
      const handleMouseMove = (opt: any) => {
        if (isPanning.current) {
          const e = opt.e;
          const vpt = initCanvas.viewportTransform!;

          const deltaX = e.clientX - lastPos.current.x;
          const deltaY = e.clientY - lastPos.current.y;

          vpt[4] += deltaX;
          vpt[5] += deltaY;

          initCanvas.requestRenderAll();
          lastPos.current = { x: e.clientX, y: e.clientY };
          setPan({ x: vpt[4], y: vpt[5] });
        }
      };

      // ======= MOUSE UP =======
      const handleMouseUp = () => {
        if (isPanning.current) {
          isPanning.current = false;
          initCanvas.selection = true;
          initCanvas.defaultCursor = isSpacePressed.current
            ? "grab"
            : "default";
        }
      };

      // ======= TOUCH EVENTS (Mobile Pinch + Pan) =======
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

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          if (!touch1 || !touch2) return;

          initialPinchDistance.current = getTouchDistance(touch1, touch2);
          initialZoom.current = initCanvas.getZoom();

          const center = getTouchCenter(touch1, touch2);
          lastPos.current = center;

          initCanvas.selection = false;
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

            initCanvas.zoomToPoint(point, newZoom);
            setZoom(newZoom);
          }

          // 2-Finger Pan
          const center = getTouchCenter(touch1, touch2);
          const vpt = initCanvas.viewportTransform!;
          vpt[4] += center.x - lastPos.current.x;
          vpt[5] += center.y - lastPos.current.y;

          initCanvas.requestRenderAll();
          lastPos.current = center;
          setPan({ x: vpt[4], y: vpt[5] });
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          initialPinchDistance.current = null;
          initCanvas.selection = true;
        }
      };

      // ======= KEYBOARD CONTROLS =======
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space" && !e.repeat) {
          e.preventDefault();
          isSpacePressed.current = true;
          if (!isPanning.current) {
            initCanvas.defaultCursor = "grab";
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          isSpacePressed.current = false;
          if (!isPanning.current) {
            initCanvas.defaultCursor = "default";
          }
        }
      };

      // Add event listeners
      initCanvas.on("mouse:wheel", handleWheel);
      initCanvas.on("mouse:down", handleMouseDown);
      initCanvas.on("mouse:move", handleMouseMove);
      initCanvas.on("mouse:up", handleMouseUp);

      // Native touch events
      const canvasEl = canvasRef.current;
      canvasEl.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      canvasEl.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      canvasEl.addEventListener("touchend", handleTouchEnd);

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      // Cleanup
      return () => {
        console.log("Disposing canvas...");
        initCanvas.off("mouse:wheel", handleWheel);
        initCanvas.off("mouse:down", handleMouseDown);
        initCanvas.off("mouse:move", handleMouseMove);
        initCanvas.off("mouse:up", handleMouseUp);

        canvasEl.removeEventListener("touchstart", handleTouchStart);
        canvasEl.removeEventListener("touchmove", handleTouchMove);
        canvasEl.removeEventListener("touchend", handleTouchEnd);

        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        initCanvas.dispose();
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="canvas"
      className="size-full border border-gray-200"
    />
  );
};
