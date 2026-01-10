import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { debounce } from "lodash";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants";
import { createWheelHandler } from "../handlers/wheel-handlers";
import { createTouchHandlers } from "../handlers/touch-handlers";
import { createSelectionHandlers } from "../handlers/selection-handlers";
import { Id } from "@workspace/backend/_generated/dataModel";
import { createMouseHandlers } from "../handlers/mouse-handlers";
import { api } from "@workspace/backend/_generated/api";
import { ReactMutation } from "convex/react";

export const useCanvasEvents = (
  canvas: fabric.Canvas | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mode: string,
  setZoom: (zoom: number) => void,
  setPan: (pan: { x: number; y: number }) => void,
  setSelectedElements: (elements: fabric.FabricObject[]) => void,
  setActiveObject: (obj: fabric.FabricObject | null) => void,
  updateObject: ReactMutation<typeof api.design.layers.updateObject>,
  removeObject: ReactMutation<typeof api.design.layers.deleteObject>
) => {
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef(1);

  useEffect(() => {
    if (!canvas || !canvasRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scaleX = viewportWidth / CANVAS_WIDTH;
    const scaleY = viewportHeight / CANVAS_HEIGHT;
    const scaleFactor = Math.min(scaleX, scaleY);

    // Create handlers
    const handleWheel = createWheelHandler(
      canvas,
      scaleFactor,
      setZoom,
      setPan
    );

    const { handleMouseDown, handleMouseMove, handleMouseUp } =
      createMouseHandlers(
        canvas,
        mode,
        isSpacePressed,
        isPanning,
        lastPos,
        setPan
      );
    const { handleTouchStart, handleTouchMove, handleTouchEnd } =
      createTouchHandlers(
        canvas,
        canvasRef,
        initialPinchDistance,
        initialZoom,
        lastPos,
        setZoom,
        setPan
      );

    const {
      handleSelectionCreated,
      handleSelectionUpdated,
      handleSelectionCleared,
    } = createSelectionHandlers(canvas, setSelectedElements);

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input fields
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Skip if editing text object
      const activeObject = canvas.getActiveObject();
      if (activeObject instanceof fabric.IText && activeObject.isEditing) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpacePressed.current = true;
        if (!isPanning.current) {
          canvas.defaultCursor = "grab";
        }
      }

      // Delete
      if (e.code === "Delete" || e.code === "Backspace") {
        if (activeObject?._id) {
          removeObject({ id: activeObject._id });
        }

        e.preventDefault();
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed.current = false;
        if (!isPanning.current) {
          canvas.defaultCursor = "default";
        }
      }
    };
    const delayedSetActiveObject = debounce((modifiedObject: fabric.Object) => {
      setActiveObject(modifiedObject);
    }, 500);

    // Object modification handler
    const handleObjectModified = debounce(
      (modifiedEvent: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
        if (modifiedEvent) {
          const modifiedObject = modifiedEvent.target;
          const finalWidth =
            (modifiedObject.width || 0) * (modifiedObject.scaleX || 1);
          const finalHeight =
            (modifiedObject.height || 0) * (modifiedObject.scaleY || 1);

          modifiedObject.set({
            width: finalWidth,
            height: finalHeight,
            scaleX: 1,
            scaleY: 1,
          });
          modifiedObject.setCoords();

          const {
            angle,
            borderScaleFactor,
            data,
            fill,
            fontFamily,
            fontSize,
            fontStyle,
            fontWeight,
            imageUrl,
            left,
            linethrough,
            name,
            opacity,
            overline,
            padding,
            points,
            rx,
            ry,
            shadow,
            stroke,
            strokeUniform,
            strokeWidth,
            text,
            textAlign,
            top,
            underline,
            parentLayerId,
          } = modifiedObject as any;

          if ((modifiedObject as any)?._id) {
            updateObject({
              _id: (modifiedObject as any)._id as Id<"layers">,
              width: finalWidth,
              height: finalHeight,
              angle,
              borderScaleFactor,
              data,
              fill: fill?.toString(),
              fontFamily,
              fontSize,
              fontStyle,
              fontWeight,
              imageUrl,
              left,
              linethrough,
              name,
              opacity,
              overline,
              padding,
              points,
              radius: finalWidth / 2,
              rx,
              ry,
              scaleX: 1,
              scaleY: 1,
              shadow: shadow?.toString(),
              stroke: stroke?.toString(),
              strokeUniform,
              strokeWidth,
              text,
              textAlign,
              top,
              underline,
              parentLayerId,
            });
          }
          delayedSetActiveObject(modifiedObject);
        }
      },
      300
    );

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.setDimensions({ width: w, height: h });

      const scaleX = w / CANVAS_WIDTH;
      const scaleY = h / CANVAS_HEIGHT;
      const scaleFactor = Math.min(scaleX, scaleY);

      canvas.setZoom(scaleFactor);

      const vpt = canvas.viewportTransform!;
      vpt[4] = (w - CANVAS_WIDTH * scaleFactor) / 2;
      vpt[5] = (h - CANVAS_HEIGHT * scaleFactor) / 2;

      canvas.setViewportTransform(vpt);
      canvas.requestRenderAll();
    };

    // Attach event listeners
    canvas.on("mouse:wheel", handleWheel);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);
    canvas.on("object:modified", handleObjectModified);

    const canvasEl = canvasRef.current;
    canvasEl.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    canvasEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", handleTouchEnd);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      canvas.off("mouse:wheel", handleWheel);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleObjectModified);

      canvasEl.removeEventListener("touchstart", handleTouchStart);
      canvasEl.removeEventListener("touchmove", handleTouchMove);
      canvasEl.removeEventListener("touchend", handleTouchEnd);

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    canvas,
    mode,
    setZoom,
    setPan,
    setSelectedElements,
    setActiveObject,
    updateObject,
    removeObject,
  ]);
};
