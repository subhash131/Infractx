"use client";
import React, { useRef } from "react";
import { Layer, Stage } from "react-konva";
import Konva from "konva";

import { CanvasFrame } from "./canvas-frame";
import { GridPattern } from "./grid-pattern";
import { ShapePreview } from "./shape-preview";

import { useCanvasZoom } from "./hooks/use-canvas-zoom";
import { useShapeDrawing } from "./hooks/use-shape-drawing";
import useCanvas from "./store";

export const CanvasStage: React.FC = () => {
  const { activeTool } = useCanvas();
  const { stageScale, stagePos, handleWheel } = useCanvasZoom();
  const stageRef = useRef<Konva.Stage>(null);

  const { newShape, handlePointerDown, handlePointerMove, handleMouseUp } =
    useShapeDrawing();

  return (
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

        {newShape && <ShapePreview shape={newShape} />}
      </Layer>
    </Stage>
  );
};
