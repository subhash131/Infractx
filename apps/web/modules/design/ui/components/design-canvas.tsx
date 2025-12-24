import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import useCanvas from "../../store";
import { CANVAS_HEIGHT, CANVAS_WIDTH, TOOLS } from "../constants";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useUpsertCanvasObject } from "../hooks/use-upsert-canvas-object";
import { debounce } from "lodash";

export const DesignCanvas = ({ canvasId }: { canvasId: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasObjects = useQuery(api.canvasObjects.getCanvasObjects, {
    canvasId: canvasId as Id<"canvases">,
  });

  const removeElement = useMutation(api.canvasObjects.deleteObject);
  const upsertCanvasObject = useUpsertCanvasObject();

  const {
    canvas,
    setCanvas,
    setZoom,
    setPan,
    mode,
    setSelectedElements,
    setActiveObject,
    activeObject,
  } = useCanvas();
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef(1);

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      console.log("Initializing canvas...");

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const scaleX = viewportWidth / CANVAS_WIDTH;
      const scaleY = viewportHeight / CANVAS_HEIGHT;
      const scaleFactor = Math.min(scaleX, scaleY);

      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        allowTouchScrolling: true,
        enableRetinaScaling: true,
        imageSmoothingEnabled: true,
        selectionBorderColor: "#4096ee",
        selectionLineWidth: 2,
        preserveObjectStacking: true,
      });

      initCanvas.setZoom(scaleFactor);
      initCanvas.setDimensions(
        {
          width: viewportWidth,
          height: viewportHeight,
        },
        { cssOnly: true }
      );

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

          const minZoom = scaleFactor * 0.1; // 10% of fit-to-screen
          const maxZoom = scaleFactor * 20; // 20x of fit-to-screen

          if (zoom > maxZoom) zoom = maxZoom;
          if (zoom < minZoom) zoom = minZoom;

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

        // Delete selected elements
        if (e.code === "Delete" || e.code === "Backspace") {
          const activeObject = initCanvas.getActiveObject();
          const activeObjects = initCanvas.getActiveObjects();

          // Skip delete if in text editing mode or typing in an input field
          if (activeObject instanceof fabric.IText && activeObject.isEditing) {
            return;
          }

          // Skip delete if user is typing in an HTML input/textarea
          const activeElement = document.activeElement;
          if (
            activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement
          ) {
            return;
          }

          if (activeObjects.length > 0) {
            e.preventDefault();
            activeObjects.forEach((element) => {
              initCanvas.remove(element);
              if (element.id) {
                removeElement({
                  id: element.id,
                });
              }
            });
            initCanvas.discardActiveObject();
            initCanvas.renderAll();
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

      // ======= SELECTION EVENTS =======
      const handleSelectionCreated = (e: any) => {
        const selected = e.selected || [];
        setSelectedElements(selected);
      };

      const handleSelectionUpdated = (e: any) => {
        const selected = e.selected || [];
        setSelectedElements(selected);
      };

      const handleSelectionCleared = () => {
        setSelectedElements([]);
      };

      const handleObjectModified = debounce(() => {
        const activeObject = initCanvas.getActiveObject();
        if (activeObject) {
          setActiveObject(activeObject);
          upsertCanvasObject({
            _id: activeObject.id,
            canvasId: canvasId as Id<"canvases">,
            objectId: activeObject.id ?? "",
            height: activeObject.height,
            width: activeObject.width,
            left: activeObject.left,
            top: activeObject.top,
            type: activeObject?.obj_type,
            angle: activeObject.angle,
            borderColor: activeObject.borderColor,
            borderScaleFactor: activeObject.borderScaleFactor,
            opacity: activeObject.opacity,
            fill: activeObject.fill ? activeObject.fill?.toString() : undefined,
            rx: activeObject.rx ? activeObject.rx : undefined,
            ry: activeObject.ry ? activeObject.ry : undefined,
            shadow: activeObject.shadow
              ? activeObject.shadow.toString()
              : undefined,
            stroke: activeObject.stroke
              ? activeObject.stroke.toString()
              : undefined,
            data: activeObject.data,
            cornerColor: activeObject.cornerColor,
            cornerSize: activeObject.cornerSize,
            cornerStrokeColor: activeObject.cornerStrokeColor,
            fontFamily: activeObject.fontFamily,
            scaleX: activeObject.scaleX,
            scaleY: activeObject.scaleY,
            strokeUniform: activeObject.strokeUniform,
            strokeWidth: activeObject.strokeWidth,
            text: activeObject.text,
            textAlign: activeObject.textAlign,
            visible: activeObject.visible,
            zIndex: activeObject.zIndex,
            fontSize: activeObject.fontSize,
            imageUrl: activeObject.imageUrl,
            locked: activeObject.locked,
            radius: activeObject.radius,
          });
        }
      });

      const handleResize = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scaleX = viewportWidth / CANVAS_WIDTH;
        const scaleY = viewportHeight / CANVAS_HEIGHT;
        const scaleFactor = Math.min(scaleX, scaleY);

        initCanvas.setZoom(scaleFactor);
        initCanvas.setDimensions(
          {
            width: viewportWidth,
            height: viewportHeight,
          },
          { cssOnly: true }
        );

        initCanvas.renderAll();
        setZoom(scaleFactor);
      };

      // Add event listeners
      initCanvas.on("mouse:wheel", handleWheel);
      initCanvas.on("mouse:down", handleMouseDown);
      initCanvas.on("mouse:move", handleMouseMove);
      initCanvas.on("mouse:up", handleMouseUp);
      initCanvas.on("selection:created", handleSelectionCreated);
      initCanvas.on("selection:updated", handleSelectionUpdated);
      initCanvas.on("selection:cleared", handleSelectionCleared);
      initCanvas.on("object:modified", handleObjectModified);

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
      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        console.log("Disposing canvas...");
        initCanvas.off("mouse:wheel", handleWheel);
        initCanvas.off("mouse:down", handleMouseDown);
        initCanvas.off("mouse:move", handleMouseMove);
        initCanvas.off("mouse:up", handleMouseUp);
        initCanvas.off("selection:created", handleSelectionCreated);
        initCanvas.off("selection:updated", handleSelectionUpdated);
        initCanvas.off("selection:cleared", handleSelectionCleared);
        initCanvas.off("object:modified", handleObjectModified);

        canvasEl.removeEventListener("touchstart", handleTouchStart);
        canvasEl.removeEventListener("touchmove", handleTouchMove);
        canvasEl.removeEventListener("touchend", handleTouchEnd);

        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("resize", handleResize);
        initCanvas.dispose();
      };
    }
  }, []);

  // Load objects from database onto canvas
  useEffect(() => {
    if (!canvas || !canvasObjects) return;

    console.log("Loading canvas objects from database...");

    // Disable rendering during batch load
    canvas.clear();
    canvas.renderOnAddRemove = false;

    canvasObjects.forEach((obj) => {
      let fabricObject;

      switch (obj.type) {
        case TOOLS.RECT:
          fabricObject = new fabric.Rect({
            id: obj._id,
            obj_type: obj.type,
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            opacity: obj.opacity,
            rx: obj.rx,
            ry: obj.ry,
            shadow: obj.shadow,
            cornerColor: obj.cornerColor,
            cornerSize: obj.cornerSize,
            cornerStrokeColor: obj.cornerStrokeColor,
            borderColor: obj.borderColor,
            borderScaleFactor: obj.borderScaleFactor,
            strokeUniform: obj.strokeUniform,
            ...(obj.data && obj.data),
          });
          break;

        case TOOLS.CIRCLE:
          fabricObject = new fabric.Circle({
            id: obj._id,
            obj_type: obj.type,
            left: obj.left,
            top: obj.top,
            radius: 50,
            width: obj.width,
            height: obj.height,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            opacity: obj.opacity,
            cornerColor: obj.cornerColor,
            cornerSize: obj.cornerSize,
            cornerStrokeColor: obj.cornerStrokeColor,
            borderColor: obj.borderColor,
            borderScaleFactor: obj.borderScaleFactor,
            strokeUniform: obj.strokeUniform,
          });
          break;

        case "LINE":
          fabricObject = new fabric.Polyline(obj.points || [], {
            id: obj._id,
            obj_type: obj.type,
            left: obj.left,
            top: obj.top,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            opacity: obj.opacity,
            cornerColor: obj.cornerColor,
            cornerSize: obj.cornerSize,
            cornerStrokeColor: obj.cornerStrokeColor,
            borderColor: obj.borderColor,
            borderScaleFactor: obj.borderScaleFactor,
            strokeUniform: obj.strokeUniform,
            ...(obj.data && obj.data),
          });
          break;

        case "PENCIL":
          fabricObject = new fabric.Path(
            obj.data?.path || "", // SVG path string from data field
            {
              id: obj._id,
              obj_type: obj.type,
              left: obj.left,
              top: obj.top,
              angle: obj.angle,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              opacity: obj.opacity,
              ...(obj.data && obj.data),
            }
          );
          break;

        case "TEXT":
          fabricObject = new fabric.IText(obj.text || "", {
            id: obj._id,
            obj_type: obj.type,
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            opacity: obj.opacity,
            rx: obj.rx,
            ry: obj.ry,
            shadow: obj.shadow,
            cornerColor: obj.cornerColor,
            cornerSize: obj.cornerSize,
            cornerStrokeColor: obj.cornerStrokeColor,
            borderColor: obj.borderColor,
            borderScaleFactor: obj.borderScaleFactor,
            strokeUniform: obj.strokeUniform,
            text: obj.text,
            ...(obj.data && obj.data),
          });
          break;

        default:
          console.warn(`Unknown object type: ${obj.type}`);
          return;
      }

      if (fabricObject) {
        // Store database ID on the object for future reference
        console.log({
          id: fabricObject.id,
          obj_type: fabricObject.type,
          left: fabricObject.left,
          top: fabricObject.top,
          width: fabricObject.width,
          height: fabricObject.height,
          angle: fabricObject.angle,
          scaleX: fabricObject.scaleX,
          scaleY: fabricObject.scaleY,
          fill: fabricObject.fill,
          stroke: fabricObject.stroke,
          strokeWidth: fabricObject.strokeWidth,
          opacity: fabricObject.opacity,
          rx: fabricObject.rx,
          ry: fabricObject.ry,
          shadow: fabricObject.shadow,
          cornerColor: fabricObject.cornerColor,
          cornerSize: fabricObject.cornerSize,
          cornerStrokeColor: fabricObject.cornerStrokeColor,
          borderColor: fabricObject.borderColor,
          borderScaleFactor: fabricObject.borderScaleFactor,
          strokeUniform: fabricObject.strokeUniform,
          ...(obj.data && obj.data),
        });
        fabricObject.set({ id: obj._id });
        canvas.add(fabricObject as fabric.FabricObject);
        if (activeObject?.id === fabricObject.id) {
          canvas.setActiveObject(fabricObject as fabric.FabricObject);
        }
      }
    });

    // Re-enable rendering and render once
    canvas.renderOnAddRemove = true;
    canvas.requestRenderAll();

    console.log(`Loaded ${canvasObjects.length} objects`);
  }, [canvas, canvasObjects]);

  return (
    <canvas
      ref={canvasRef}
      id="canvas"
      className="size-full border border-gray-200"
    />
  );
};
