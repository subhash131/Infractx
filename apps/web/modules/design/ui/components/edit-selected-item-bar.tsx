"use client";

import React, { useEffect, useState } from "react";
import useCanvas from "../../store";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

interface ElementProperties {
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  borderRadius: number;
}

export const EditSelectedItemBar = () => {
  const selectedElements = useCanvas((state) => state.selectedElements);
  const canvas = useCanvas((state) => state.canvas);

  const updateCanvasObject = useMutation(api.canvasObjects.updateObject);

  const [properties, setProperties] = useState<ElementProperties>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    fill: "#000000",
    stroke: "transparent",
    strokeWidth: 0,
    opacity: 1,
    borderRadius: 0,
  });

  const hasSelection = selectedElements.length > 0;
  const isSingleSelection = selectedElements.length === 1;

  useEffect(() => {
    if (isSingleSelection && selectedElements[0]) {
      const element = selectedElements[0];
      setProperties({
        left: Math.round(element.left || 0),
        top: Math.round(element.top || 0),
        width: Math.round((element.width || 0) * (element.scaleX || 1)),
        height: Math.round((element.height || 0) * (element.scaleY || 1)),
        fill: (element.fill as string) || "#000000",
        stroke: (element.stroke as string) || "transparent",
        strokeWidth: element.strokeWidth || 0,
        opacity: element.opacity || 1,
        borderRadius: (element as any).rx || 0,
      });
    }
  }, [selectedElements]);

  // Apply opacity changes in real-time
  useEffect(() => {
    if (isSingleSelection && selectedElements[0]) {
      selectedElements[0].set({ opacity: properties.opacity });
      canvas?.renderAll();
    }
  }, [properties.opacity, isSingleSelection, selectedElements, canvas]);

  // Apply color and stroke changes in real-time
  useEffect(() => {
    if (isSingleSelection && selectedElements[0]) {
      const borderRadiusValue = isNaN(properties.borderRadius)
        ? 0
        : properties.borderRadius;

      const setObj: any = {
        fill: properties.fill,
        stroke: properties.stroke,
        strokeWidth: isNaN(properties.strokeWidth) ? 0 : properties.strokeWidth,
        strokeUniform: true,
      };

      // Only apply border radius to rectangles
      if (selectedElements[0].type === "rect") {
        setObj.rx = borderRadiusValue;
        setObj.ry = borderRadiusValue;
      }

      selectedElements[0].set(setObj);

      canvas?.renderAll();
    }
  }, [
    properties.fill,
    properties.stroke,
    properties.strokeWidth,
    properties.borderRadius,
    isSingleSelection,
    selectedElements,
    canvas,
  ]);

  const handlePropertyChange = (key: keyof ElementProperties, value: any) => {
    let newValue: any;

    if (key === "fill" || key === "stroke") {
      // For colors, if value is empty or invalid, set to #000000
      newValue = value === "" || !value ? "#000000" : value;
    } else {
      // For other numeric properties
      newValue = isNaN(value) ? value : parseFloat(value);
    }

    setProperties((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyChanges();
    }
  };

  const applyChanges = () => {
    if (!isSingleSelection || !selectedElements[0]) return;

    const element = selectedElements[0];
    element.set({
      left: isNaN(properties.left) ? 0 : properties.left,
      top: isNaN(properties.top) ? 0 : properties.top,
      width: isNaN(properties.width) ? 0 : properties.width,
      height: isNaN(properties.height) ? 0 : properties.height,
      scaleX: 1,
      scaleY: 1,
      fill: properties.fill,
      stroke: properties.stroke,
      strokeWidth: isNaN(properties.strokeWidth) ? 0 : properties.strokeWidth,
      strokeUniform: true,
      opacity: properties.opacity,
    });

    // Set border radius (rx and ry for rectangles)
    const borderRadiusValue = isNaN(properties.borderRadius)
      ? 0
      : properties.borderRadius;
    if ((element as any).rx !== undefined) {
      (element as any).rx = borderRadiusValue;
      (element as any).ry = borderRadiusValue;
    }

    canvas?.renderAll();
    // // Force update in store to trigger re-renders
  };

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

          {isSingleSelection && (
            <div className="space-y-4">
              {/* Position Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Position
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="left" className="text-xs">
                      X
                    </Label>
                    <Input
                      id="left"
                      type="number"
                      value={isNaN(properties.left) ? "" : properties.left}
                      onChange={(e) =>
                        handlePropertyChange("left", e.target.value)
                      }
                      onKeyDown={handleKeyPress}
                      onBlur={applyChanges}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="top" className="text-xs">
                      Y
                    </Label>
                    <Input
                      id="top"
                      type="number"
                      value={isNaN(properties.top) ? "" : properties.top}
                      onChange={(e) =>
                        handlePropertyChange("top", e.target.value)
                      }
                      onKeyDown={handleKeyPress}
                      onBlur={applyChanges}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Size Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Size
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="width" className="text-xs">
                      Width
                    </Label>
                    <Input
                      id="width"
                      type="number"
                      value={isNaN(properties.width) ? "" : properties.width}
                      onChange={(e) =>
                        handlePropertyChange("width", e.target.value)
                      }
                      onKeyDown={handleKeyPress}
                      onBlur={applyChanges}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="height" className="text-xs">
                      Height
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={isNaN(properties.height) ? "" : properties.height}
                      onChange={(e) =>
                        handlePropertyChange("height", e.target.value)
                      }
                      onKeyDown={handleKeyPress}
                      onBlur={applyChanges}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Appearance
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="fill" className="text-xs">
                      Fill Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="fill"
                        type="color"
                        value={properties.fill}
                        onChange={(e) =>
                          handlePropertyChange("fill", e.target.value)
                        }
                        className="h-8 w-12 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={properties.fill}
                        onChange={(e) =>
                          handlePropertyChange("fill", e.target.value)
                        }
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="stroke" className="text-xs">
                      Stroke Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="stroke"
                        type="color"
                        value={
                          properties.stroke === "transparent"
                            ? "#000000"
                            : properties.stroke
                        }
                        onChange={(e) =>
                          handlePropertyChange("stroke", e.target.value)
                        }
                        className="h-8 w-12 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={properties.stroke}
                        onChange={(e) =>
                          handlePropertyChange("stroke", e.target.value)
                        }
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="strokeWidth" className="text-xs">
                      Stroke Width
                    </Label>
                    <Input
                      id="strokeWidth"
                      type="number"
                      min="0"
                      step="1"
                      value={
                        isNaN(properties.strokeWidth)
                          ? ""
                          : properties.strokeWidth
                      }
                      onChange={(e) =>
                        handlePropertyChange("strokeWidth", e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="opacity" className="text-xs">
                      Opacity ({Math.round(properties.opacity * 100)}%)
                    </Label>
                    <Input
                      id="opacity"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={properties.opacity}
                      onChange={(e) =>
                        handlePropertyChange("opacity", e.target.value)
                      }
                      className="h-8"
                    />
                  </div>
                  {selectedElements[0]?.type === "rect" && (
                    <div className="space-y-1">
                      <Label htmlFor="borderRadius" className="text-xs">
                        Border Radius ({properties.borderRadius})
                      </Label>
                      <Input
                        id="borderRadius"
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={
                          isNaN(properties.borderRadius)
                            ? 0
                            : properties.borderRadius
                        }
                        onChange={(e) =>
                          handlePropertyChange("borderRadius", e.target.value)
                        }
                        className="h-8"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isSingleSelection && hasSelection && (
            <div className="text-xs text-muted-foreground">
              Multiple items selected. Select one item to edit properties.
            </div>
          )}
        </>
      )}
    </div>
  );
};
