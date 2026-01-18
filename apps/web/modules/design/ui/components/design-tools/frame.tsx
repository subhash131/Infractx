"use client";
import React, { useEffect } from "react";
import * as fabric from "fabric";
import { Square } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

/* ================= FRAME CLASS (UNCHANGED) ================= */

export class Frame extends fabric.Group {
  constructor(objects: fabric.FabricObject[], options?: any) {
    super(objects, {
      ...options,
      subTargetCheck: true,
      interactive: true,
      obj_type: "FRAME",
      layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
      originX: "left",
      originY: "top",
    });

    const background = new fabric.Rect({
      left: options?.left,
      top: options?.top,
      width: options?.width || 800,
      height: options?.height || 600,
      fill: options?.fill || "#ffffff",
      stroke: options?.stroke || "#e5e5e5",
      strokeWidth: 0,
      selectable: false,
      evented: false,
    });

    this.add(background);
    this.sendObjectToBack(background);
    this.width = background.width;
    this.height = background.height;

    this.clipPath = background as fabric.BaseFabricObject;
  }

  addChild(child: fabric.FabricObject) {
    this.add(child);
    this.setCoords();
    return this;
  }

  removeChild(child: fabric.FabricObject) {
    this.remove(child);
    this.setCoords();
    return this;
  }

  calculateOverlapPercentage(obj: fabric.FabricObject): number {
    const frameBounds = this.getBoundingRect();
    const objBounds = obj.getBoundingRect();

    const left = Math.max(frameBounds.left, objBounds.left);
    const top = Math.max(frameBounds.top, objBounds.top);
    const right = Math.min(
      frameBounds.left + frameBounds.width,
      objBounds.left + objBounds.width,
    );
    const bottom = Math.min(
      frameBounds.top + frameBounds.height,
      objBounds.top + objBounds.height,
    );

    if (right <= left || bottom <= top) return 0;

    const intersectArea = (right - left) * (bottom - top);
    const objArea = objBounds.width * objBounds.height;

    return (intersectArea / objArea) * 100;
  }
}

/* ================= FRAME TOOL ================= */

export const FrameTool = () => {
  const { canvas, activeDesignId } = useCanvas();
  const createFrame = useMutation(api.design.layers.createObject);

  const file = useQuery(
    api.design.files.getFile,
    activeDesignId ? { designId: activeDesignId as Id<"designs"> } : "skip",
  );

  const handleAddFrame = async () => {
    if (!canvas) return;

    const frames = canvas
      .getObjects()
      .filter((o) => o.obj_type === "FRAME") as Frame[];

    const rightmostEdge =
      frames.length > 0
        ? Math.max(...frames.map((f) => (f.left ?? 0) + (f.width ?? 0)))
        : 0;

    const frame = new Frame([], {
      width: 800,
      height: 600,
      fill: "#ffffff",
      stroke: "#e5e5e5",
      strokeWidth: 0,
    });

    const vpt = canvas.viewportTransform!;
    const zoom = canvas.getZoom();
    const centerY = (canvas.height! / 2 - vpt[5]) / zoom;

    frame.set({
      left: rightmostEdge + 10,
      top: centerY - 300,
    });

    canvas.add(frame);
    canvas.setActiveObject(frame);
    canvas.requestRenderAll();

    await createFrame({
      layerObject: {
        pageId: file?.activePage as Id<"pages">,
        type: "FRAME",
        name: "Frame",
        width: 800,
        height: 600,
        left: frame.left!,
        top: frame.top!,
        scaleX: 1,
        scaleY: 1,
        fill: frame.fill?.toString() || "#ffffff",
      },
    });
  };

  useEffect(() => {
    if (!canvas) return;

    let pendingEnterFrame: Frame | null = null;
    let pendingObject: fabric.FabricObject | null = null;

    const handleObjectMoving = (
      e: fabric.BasicTransformEvent<fabric.TPointerEvent>,
    ) => {
      const movingObj = e.transform.target;
      if (!movingObj || movingObj instanceof Frame) return;

      movingObj.setCoords();

      const frames = canvas
        .getObjects()
        .filter((obj) => obj instanceof Frame) as Frame[];

      frames.forEach((frame) => {
        frame.setCoords();
        const overlapPercentage = frame.calculateOverlapPercentage(movingObj);

        /* ================= ENTER FRAME (DEFERRED) ================= */
        if (overlapPercentage >= 70 && !frame.contains(movingObj)) {
          pendingEnterFrame = frame;
          pendingObject = movingObj;
        }

        /* ================= EXIT FRAME (UNCHANGED, WORKING) ================= */
        if (overlapPercentage <= 30 && frame.contains(movingObj)) {
          movingObj.set({
            left: movingObj.left + frame.left,
            top: movingObj.top + frame.top,
            parentLayerId: undefined,
            opacity: 0,
          });
          frame.removeChild(movingObj);
          canvas.add(movingObj);
          requestAnimationFrame(() => {
            movingObj.set({ opacity: 1 });
            canvas.requestRenderAll();
          });
        }
      });
    };

    const handleMouseUp = () => {
      if (!pendingEnterFrame || !pendingObject) return;

      const frame = pendingEnterFrame;
      const obj = pendingObject;

      canvas.remove(obj);

      obj.set({
        parentLayerId: frame._id,
      });

      frame.addChild(obj);
      obj.setCoords();

      canvas.setActiveObject(obj);
      canvas.requestRenderAll();

      pendingEnterFrame = null;
      pendingObject = null;
    };

    canvas.on("object:moving", handleObjectMoving);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [canvas]);

  return (
    <Button
      onClick={handleAddFrame}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Square className="h-4 w-4" />
      Frame
    </Button>
  );
};
