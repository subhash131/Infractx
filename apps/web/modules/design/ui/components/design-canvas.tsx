"use client";
import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import useCanvas from "../../store";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { debounce } from "lodash";
import { Frame } from "./design-tools/frame";

const createFabricObject = (layer: any): fabric.FabricObject | null => {
  let fabricObj: fabric.FabricObject | null = null;

  const { type, fontWeight, ...obj } = layer;

  switch (type) {
    case "RECT":
      fabricObj = new fabric.Rect({
        ...obj,
        obj_type: type,
        absolutePositioned: false,
      } as fabric.TOptions<fabric.RectProps>);

      break;
    case "CIRCLE":
      fabricObj = new fabric.Circle({
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.CircleProps>);
      break;
    case "LINE":
      fabricObj = new fabric.Polyline(layer.points || [], {
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.RectProps>);
      break;
    case "TEXT":
      fabricObj = new fabric.IText(obj.text || "", {
        ...obj,
        obj_type: type, 
      }) as fabric.FabricObject<Partial<fabric.FabricObjectProps>>;

      break;
    case "FRAME": {
      const childObjects: fabric.FabricObject[] = [];
      const childPositions: Array<{
        obj: fabric.FabricObject;
        left: number;
        top: number;
      }> = [];

      if (layer.children && layer.children.length > 0) {
        layer.children.forEach((childLayer: any) => {
          const childObj = createFabricObject(childLayer);
          if (childObj) {
            // Store for later application
            childPositions.push({
              obj: childObj,
              left: childObj.left,
              top: childObj.top,
            });

            childObjects.push(childObj);
          }
        });
      }

      fabricObj = new Frame(childObjects, {
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.RectProps>);

      // Store positions for later
      (fabricObj as any)._pendingChildPositions = childPositions;
      break;
    }
    default:
      break;
  }

  if (fabricObj) {
    fabricObj.set({ _id: layer._id });
  }

  return fabricObj;
};

export const DesignCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    canvas,
    setCanvas,
    setZoom,
    setPan,
    mode,
    setSelectedElements,
    setActiveObject,
    activeObject,
    activeFileId,
  } = useCanvas();
  const file = useQuery(
    api.design.files.getFile,
    activeFileId ? { fileId: activeFileId as Id<"files"> } : "skip"
  );
  const page = useQuery(
    api.design.pages.getPageById,
    file?.activePage ? { pageId: file.activePage } : "skip"
  );
  const layers = useQuery(
    api.design.layers.getLayersByPage,
    file?.activePage
      ? {
          pageId: file.activePage,
        }
      : "skip"
  );

  const removeElement = useMutation(api.design.layers.deleteObject);
  const updateObject = useMutation(api.design.layers.updateObject);

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

          if (activeObject?._id)
            removeElement({
              id: activeObject._id,
            });

          e.preventDefault();

          initCanvas.discardActiveObject();
          initCanvas.renderAll();
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
        const activeObj = initCanvas.getActiveObject();
        if (activeObj) {
          setActiveObject(activeObj);

          // IMPORTANT: Normalize scale before saving
          const finalWidth = (activeObj.width || 0) * (activeObj.scaleX || 1);
          const finalHeight = (activeObj.height || 0) * (activeObj.scaleY || 1);

          // Update the object to use normalized dimensions
          activeObj.set({
            width: finalWidth,
            height: finalHeight,
            scaleX: 1,
            scaleY: 1,
          });
          activeObj.setCoords();
          const {
            angle,
            borderColor,
            borderScaleFactor,
            cornerColor,
            cornerSize,
            cornerStrokeColor,
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
            radius,
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
          } = activeObj;

          if (activeObj?._id)
            updateObject({
              _id: activeObj._id as Id<"layers">,
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
              radius,
              rx,
              ry,
              scaleX: 1, // Always save as 1
              scaleY: 1, // Always save as 1
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

  useEffect(() => {
    if (!canvas || !canvasRef.current) return;
    canvas.clear();
    canvas.renderOnAddRemove = false;
    canvas.backgroundColor = page?.bgColor || "#d9d9d9";

    layers?.forEach((layer) => {
      const fabricObj = createFabricObject(layer);

      if (fabricObj) {
        canvas.add(fabricObj);

        // Apply child positions AFTER adding to canvas
        if ((fabricObj as any)._pendingChildPositions) {
          (fabricObj as any)._pendingChildPositions.forEach(
            ({ obj, left, top }: any) => {
              obj.set({
                left,
                top,
              });
              obj.setCoords();
              if (activeObject?._id === obj._id) {
                canvas.setActiveObject(obj as fabric.FabricObject);
              }
            }
          );
          delete (fabricObj as any)._pendingChildPositions;
        }

        if (activeObject?._id === fabricObj._id) {
          canvas.setActiveObject(fabricObj as fabric.FabricObject);
        }
      }
    });

    canvas.renderOnAddRemove = true;
    canvas.requestRenderAll();
  }, [layers]);

  return (
    <canvas
      ref={canvasRef}
      id="canvas"
      className="size-full border border-gray-200"
    />
  );
};
