"use client";
import React from "react";
import * as fabric from "fabric";
import { Square } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import useCanvas from "../../../store";
import { Id } from "@workspace/backend/_generated/dataModel";
import { v4 as uuidv4 } from "uuid";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

// Custom Frame class extending fabric.Group
export class Frame extends fabric.Group {
  constructor(objects: fabric.FabricObject[], options?: any) {
    super(objects, {
      ...options,
      subTargetCheck: true,
      interactive: true,
      type: "frame",
    });

    // Add frame background
    const background = new fabric.Rect({
      left: options?.left,
      top: options?.top,
      width: options?.width || 800,
      height: options?.height || 600,
      fill: options?.fill || "#ffffff",
      stroke: options?.stroke || "#e5e5e5",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      visible: true,
    });

    this.add(background);
    this.sendObjectBackwards(background);
    this.width = background.width;
    this.height = background.height;

    // Enable clipping by default
    this.clipPath = background as fabric.BaseFabricObject;
  }

  // Add child to frame
  addChild(child: fabric.FabricObject) {
    this.add(child);
    this.setCoords();
    return this;
  }

  // Remove child from frame
  removeChild(child: fabric.FabricObject) {
    this.remove(child);
    this.setCoords();
    return this;
  }

  // Align children horizontally
  alignChildrenHorizontal(
    alignment: "left" | "center" | "right" | "space-between"
  ) {
    const children = this._objects.slice(1); // Skip background
    if (children.length === 0) return;

    const frameWidth = (this._objects[0] as fabric.Rect).width!;
    const frameLeft = -(frameWidth / 2);

    switch (alignment) {
      case "left":
        children.forEach((child) => {
          child.set({ left: frameLeft + 20 });
        });
        break;

      case "center":
        children.forEach((child) => {
          const childWidth = child.width! * (child.scaleX || 1);
          child.set({ left: -childWidth / 2 });
        });
        break;

      case "right":
        children.forEach((child) => {
          const childWidth = child.width! * (child.scaleX || 1);
          child.set({ left: frameWidth / 2 - childWidth - 20 });
        });
        break;

      case "space-between":
        const totalWidth = children.reduce(
          (sum, child) => sum + child.width! * (child.scaleX || 1),
          0
        );
        const spacing = (frameWidth - totalWidth - 40) / (children.length - 1);
        let currentLeft = frameLeft + 20;

        children.forEach((child) => {
          child.set({ left: currentLeft });
          currentLeft += child.width! * (child.scaleX || 1) + spacing;
        });
        break;
    }

    this.setCoords();
  }

  // Align children vertically
  alignChildrenVertical(
    alignment: "top" | "center" | "bottom" | "space-between"
  ) {
    const children = this._objects.slice(1); // Skip background
    if (children.length === 0) return;

    const frameHeight = (this._objects[0] as fabric.Rect).height!;
    const frameTop = -(frameHeight / 2);

    switch (alignment) {
      case "top":
        children.forEach((child) => {
          child.set({ top: frameTop + 20 });
        });
        break;

      case "center":
        children.forEach((child) => {
          const childHeight = child.height! * (child.scaleY || 1);
          child.set({ top: -childHeight / 2 });
        });
        break;

      case "bottom":
        children.forEach((child) => {
          const childHeight = child.height! * (child.scaleY || 1);
          child.set({ top: frameHeight / 2 - childHeight - 20 });
        });
        break;

      case "space-between":
        const totalHeight = children.reduce(
          (sum, child) => sum + child.height! * (child.scaleY || 1),
          0
        );
        const spacing =
          (frameHeight - totalHeight - 40) / (children.length - 1);
        let currentTop = frameTop + 20;

        children.forEach((child) => {
          child.set({ top: currentTop });
          currentTop += child.height! * (child.scaleY || 1) + spacing;
        });
        break;
    }

    this.setCoords();
  }

  // Auto layout - arrange children in rows or columns
  autoLayout(
    direction: "row" | "column",
    gap: number = 16,
    padding: number = 20
  ) {
    const children = this._objects.slice(1); // Skip background
    if (children.length === 0) return;

    const background = this._objects[0] as fabric.Rect;
    const frameWidth = background.width!;
    const frameHeight = background.height!;
    const startX = -(frameWidth / 2) + padding;
    const startY = -(frameHeight / 2) + padding;

    if (direction === "row") {
      let currentX = startX;
      let currentY = startY;
      let rowHeight = 0;

      children.forEach((child) => {
        const childWidth = child.width! * (child.scaleX || 1);
        const childHeight = child.height! * (child.scaleY || 1);

        // Wrap to next row if exceeds frame width
        if (
          currentX + childWidth > frameWidth / 2 - padding &&
          currentX !== startX
        ) {
          currentX = startX;
          currentY += rowHeight + gap;
          rowHeight = 0;
        }

        child.set({
          left: currentX,
          top: currentY,
        });

        currentX += childWidth + gap;
        rowHeight = Math.max(rowHeight, childHeight);
      });
    } else {
      let currentY = startY;

      children.forEach((child) => {
        const childHeight = child.height! * (child.scaleY || 1);

        child.set({
          left: startX,
          top: currentY,
        });

        currentY += childHeight + gap;
      });
    }

    this.setCoords();
  }

  // Resize frame to fit all children
  fitToChildren(padding: number = 20) {
    const children = this._objects.slice(1); // Skip background
    if (children.length === 0) return;

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    children.forEach((child) => {
      const childLeft = child.left!;
      const childTop = child.top!;
      const childWidth = child.width! * (child.scaleX || 1);
      const childHeight = child.height! * (child.scaleY || 1);

      minX = Math.min(minX, childLeft);
      minY = Math.min(minY, childTop);
      maxX = Math.max(maxX, childLeft + childWidth);
      maxY = Math.max(maxY, childTop + childHeight);
    });

    const newWidth = maxX - minX + padding * 2;
    const newHeight = maxY - minY + padding * 2;

    const background = this._objects[0] as fabric.Rect;
    background.set({
      width: newWidth,
      height: newHeight,
    });

    this.clipPath = background as fabric.BaseFabricObject;
    this.setCoords();
  }
}

export const FrameTool = () => {
  const { canvas, activeFileId } = useCanvas();
  const createFrame = useMutation(api.design.layers.createObject);

  const file = useQuery(
    api.design.files.getFile,
    activeFileId
      ? {
          fileId: activeFileId as Id<"files">,
        }
      : "skip"
  );

  const handleAddFrame = async () => {
    if (!canvas) return;

    // Create a new frame
    const frame = new Frame([], {
      width: 800,
      height: 600,
      fill: "#ffffff",
      stroke: "#e5e5e5",
      strokeWidth: 2,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1,
      strokeUniform: true,
    });

    // Center the frame in viewport
    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    const centerX = (canvas.width! / 2 - vpt![4]) / zoom;
    const centerY = (canvas.height! / 2 - vpt![5]) / zoom;

    frame.set({
      left: centerX - 400 + canvas._objects.length * 10,
      top: centerY - 300 + canvas._objects.length * 10,
    });

    canvas.add(frame);
    canvas.setActiveObject(frame);
    canvas.requestRenderAll();

    // Save to backend
    await createFrame({
      pageId: file?.activePage as Id<"pages">,
      type: "FRAME",
      height: 600,
      left: frame.left!,
      objectId: uuidv4(),
      top: frame.top!,
      width: 800,
      angle: 0,
      fill: "#ffffff",
      opacity: 1,
      stroke: "#e5e5e5",
      strokeWidth: 2,
      scaleX: 1,
      scaleY: 1,
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1,
      strokeUniform: true,
      name: "Frame",
    });
  };

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
