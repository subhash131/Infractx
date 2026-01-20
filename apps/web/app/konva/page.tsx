"use client";
import React, { useRef, useState } from "react";
import { Layer, Stage, Rect, Circle } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { cn } from "@workspace/ui/lib/utils";

import { CanvasFrame } from "./(components)/canvas-frame";
import { ToolBar } from "./(components)/toolbar";
import { GridPattern } from "./(components)/grid-pattern";

import { useCanvasZoom } from "./(components)/hooks/use-canvas-zoom";
import useCanvas from "./(components)/store";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";

import type { FunctionArgs } from "convex/server";

type CreateShapeArgs = FunctionArgs<typeof api.design.shapes.createShape>;

const App: React.FC = () => {
  const { activeTool, setActiveTool } = useCanvas();
  const { stageScale, stagePos, handleWheel } = useCanvasZoom();
  const stageRef = useRef<Konva.Stage>(null);

  const createShape = useMutation(api.design.shapes.createShape);

  const [newShape, setNewShape] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  } | null>(null);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (activeTool === "SELECT") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    switch (activeTool) {
      case "RECT":
        setNewShape({
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          width: 10,
          height: 10,
        });
        break;
      case "CIRCLE":
        setNewShape({
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          radius: 10,
        });
        break;
    }
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (activeTool === "SELECT" || !newShape) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    switch (activeTool) {
      case "RECT":
        setNewShape((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            width: pos.x - prev.startX,
            height: pos.y - prev.startY,
          };
        });
        break;
      case "CIRCLE":
        setNewShape((prev) => {
          if (!prev) return null;
          const radius = Math.sqrt(
            Math.pow(pos.x - prev.startX, 2) + Math.pow(pos.y - prev.startY, 2),
          );
          return {
            ...prev,
            width: radius * 2,
            height: radius * 2,
            radius,
          };
        });
    }
  };

  const handleMouseUp = () => {
    if (!newShape) return;
    let shapeObject: CreateShapeArgs["shapeObject"] | null = null;

    switch (activeTool) {
      case "RECT":
        shapeObject = {
          type: "RECT" as Doc<"shapes">["type"],
          x: newShape.width < 0 ? newShape.x + newShape.width : newShape.x,
          y: newShape.height < 0 ? newShape.y + newShape.height : newShape.y,
          width: Math.abs(newShape.width),
          height: Math.abs(newShape.height),
          fill: "#008080",
          opacity: 1,
          strokeWidth: 0,
          order: 0,
          rotation: 0,
          pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
          name: "Rectangle",
        };
        break;
      case "CIRCLE":
        shapeObject = {
          type: "CIRCLE" as Doc<"shapes">["type"],
          x: newShape.width < 0 ? newShape.x + newShape.width : newShape.x,
          y: newShape.height < 0 ? newShape.y + newShape.height : newShape.y,
          width: Math.abs(newShape.width),
          height: Math.abs(newShape.height),
          fill: "#008080",
          opacity: 1,
          strokeWidth: 0,
          order: 0,
          rotation: 0,
          pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
          name: "Circle",
        };
        break;
    }
    if (shapeObject)
      createShape({
        shapeObject,
      });

    console.log("Created shape:", shapeObject);

    setNewShape(null);
    setActiveTool("SELECT");
  };

  return (
    <div
      className={cn(
        "overflow-hidden h-screen w-screen",
        activeTool !== "SELECT" && "cursor-crosshair",
      )}
    >
      <ToolBar />
      <Stage
        ref={stageRef}
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight : 600}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={activeTool === "SELECT"}
        style={{ background: "#ffffff" }}
      >
        <Layer>
          <GridPattern />
          <CanvasFrame
            key={"12342"}
            frame={{
              id: "1233",
              fill: "#ffffff",
              height: 800,
              width: 600,
              x: 50,
              y: 50,
            }}
            shapes={[]}
            isSelected={true}
            onSelect={() => {}}
            onUpdate={() => {}}
            onShapeUpdate={() => {}}
          />

          {newShape && activeTool === "RECT" && (
            <Rect
              x={newShape.x}
              y={newShape.y}
              width={newShape.width}
              height={newShape.height}
              fill="rgba(33, 150, 243, 0.2)"
              stroke="rgba(33, 150, 243, 1)"
              strokeWidth={1}
            />
          )}
          {newShape && activeTool === "CIRCLE" && (
            <Circle
              radius={newShape.radius}
              x={newShape.x}
              y={newShape.y}
              fill="rgba(33, 150, 243, 0.2)"
              stroke="rgba(33, 150, 243, 1)"
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
