"use client";

import React, { useEffect, useState, useCallback } from "react";
import useCanvas from "../../../store";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import * as fabric from "fabric";

import { PositionPanel } from "./position-panel";
import { SizePanel } from "./size-panel";
import { AppearancePanel } from "./appearance-panel";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";

const INITIAL_PROPERTIES: Partial<Doc<"layers">> = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  fill: "#000000",
  stroke: "#FFFFFF00",
  strokeWidth: 0,
  opacity: 1,
  radius: 0,
};

export const EditSelectedItemBar = () => {
  const selectedElements = useCanvas((state) => state.selectedElements);
  const canvas = useCanvas((state) => state.canvas);
  const updateLayer = useMutation(api.design.layers.updateObject);

  const [properties, setProperties] =
    useState<Partial<Doc<"layers">>>(INITIAL_PROPERTIES);

  const hasSelection = selectedElements.length > 0;
  const isSingleSelection = selectedElements.length === 1;
  const activeElement = isSingleSelection ? selectedElements[0] : null;

  // 1. Sync State with Selection
  useEffect(() => {
    if (activeElement) {
      setProperties({
        left: Math.round(activeElement.left || 0),
        top: Math.round(activeElement.top || 0),
        width: Math.round(
          (activeElement.width || 0) * (activeElement.scaleX || 1)
        ),
        height: Math.round(
          (activeElement.height || 0) * (activeElement.scaleY || 1)
        ),
        fill: activeElement.fill?.toString() || "#FFFFFF00",
        stroke: activeElement.stroke?.toString() || "#FFFFFF00",
        strokeWidth: activeElement.strokeWidth || 0,
        opacity: activeElement.opacity || 1,
        radius:
          activeElement.obj_type === "CIRCLE"
            ? Math.round(activeElement.radius || 10)
            : Math.round(activeElement.rx || 0),
      });
    }
  }, [activeElement]);

  // Helper to safely parse numbers (converts "-" or "" to 0)
  const safeParseFloat = (value: string | number) => {
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  };

  // 2. Real-time updates for Appearance
  useEffect(() => {
    if (!activeElement || !canvas) return;

    const borderRadiusValue = safeParseFloat(properties.radius || 0);
    const width = safeParseFloat(properties.width || 0);
    const height = safeParseFloat(properties.height || 0);
    const strokeWidthValue = safeParseFloat(properties.strokeWidth || 0);

    const setObj: Partial<fabric.FabricObjectProps> = {
      fill: properties.fill,
      stroke: properties.stroke,
      strokeWidth: strokeWidthValue,
      strokeUniform: true,
      opacity: properties.opacity,
      width,
      height,
    };

    if (activeElement.type === "rect") {
      setObj.rx = borderRadiusValue;
      setObj.ry = borderRadiusValue;
    } else if (activeElement.type === "circle") {
      setObj.radius = borderRadiusValue;
    }

    activeElement.set(setObj);
    canvas?._activeObject?.setCoords();
    canvas.renderAll();
  }, [
    properties.fill,
    properties.stroke,
    properties.strokeWidth,
    properties.radius,
    properties.opacity,
    activeElement,
    canvas,
  ]);

  // 3. Handlers
  const handlePropertyChange = useCallback(
    (key: keyof Partial<Doc<"layers">>, value: any) => {
      let newValue: any;

      if (key === "fill" || key === "stroke") {
        newValue = value === "" || !value ? "#000000" : value;
      } else {
        // Logic change: Allow intermediate states like "-" or empty string
        if (value === "" || value === "-") {
          newValue = value;
        } else {
          // Only parse if it looks like a real number
          const parsed = parseFloat(value);
          newValue = isNaN(parsed) ? value : parsed;
        }
      }

      setProperties((prev) => ({ ...prev, [key]: newValue }));
    },
    []
  );

  const applyChanges = useCallback(() => {
    if (!activeElement || !canvas) return;

    const left = safeParseFloat(properties.left || 0);
    const top = safeParseFloat(properties.top || 0);
    const width = safeParseFloat(properties.width || 0);
    const height = safeParseFloat(properties.height || 0);
    const radius =
      canvas._activeObject?.obj_type === "CIRCLE"
        ? safeParseFloat(properties.radius || 0)
        : safeParseFloat(properties.rx || 0);

    activeElement.set({ left, top, width, height });
    activeElement.setCoords();
    canvas.renderAll();

    updateLayer({
      _id: activeElement._id as Id<"layers">,
      left,
      top,
      width,
      height,
      radius,
      parentLayerId: activeElement.parentLayerId,
      ...properties,
    }).catch((err) => console.error("Failed to update layer:", err));
  }, [activeElement, canvas, properties, selectedElements, updateLayer]);

  return (
    <div className="w-44 h-full border-l bg-sidebar absolute right-0 z-99 overflow-y-auto p-4 flex flex-col gap-4">
      {!hasSelection ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Select an item to edit
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              {selectedElements.length} item
              {selectedElements.length !== 1 ? "s" : ""} selected
            </h3>
          </div>

          {activeElement && (
            <div className="space-y-4">
              <PositionPanel
                properties={properties}
                onChange={handlePropertyChange}
                onCommit={applyChanges}
              />

              <SizePanel
                properties={properties}
                onChange={handlePropertyChange}
                onCommit={applyChanges}
              />

              <AppearancePanel
                properties={properties}
                showBorderRadius={activeElement.type === "rect"}
                onChange={handlePropertyChange}
              />
            </div>
          )}

          {!isSingleSelection && (
            <div className="text-xs text-muted-foreground">
              Multiple items selected. Select one item to edit properties.
            </div>
          )}
        </>
      )}
    </div>
  );
};
