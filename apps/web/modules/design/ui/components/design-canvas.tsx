"use client";
import React, { useRef } from "react";
import useCanvas from "../../store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useCanvasInit } from "../hooks/use-canvas-init";
import { useCanvasKeyboard } from "../hooks/use-canvas-keyboard";
import { useCanvasEvents } from "../hooks/use-canvas-events";
import { useCanvasLayers } from "../hooks/use-canvas-layers";

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
    activePageId,
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
    file?.activePage ? { pageId: file.activePage } : "skip"
  );

  const removeObject = useMutation(api.design.layers.deleteObject);
  const updateObject = useMutation(api.design.layers.updateObject);
  const createObject = useMutation(api.design.layers.createObject);

  // Initialize canvas
  useCanvasInit(canvasRef, canvas, setCanvas, setZoom);

  // Keyboard shortcuts
  useCanvasKeyboard(
    canvas,
    activePageId as Id<"pages">,
    createObject,
    updateObject,
    removeObject
  );

  // Canvas events (wheel, mouse, touch, selection, etc.)
  useCanvasEvents(
    canvas,
    canvasRef,
    mode,
    setZoom,
    setPan,
    setSelectedElements,
    setActiveObject,
    updateObject,
    removeObject
  );

  // Render layers
  useCanvasLayers(
    canvas,
    canvasRef,
    layers as Doc<"layers">[],
    page as Doc<"pages">
  );

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} id="canvas" className="w-full h-full block" />
    </div>
  );
};
