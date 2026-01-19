"use client";
import { Layer, Stage, Group } from "react-konva";
import { Header } from "./(components)/header";
import { useRef, useState } from "react";
import { useCanvasZoom } from "./(components)/hooks/use-canvas-zoom";
import { useFrames } from "./(components)/hooks/use-frame";
import { useShapes } from "./(components)/hooks/use-shapes";
import { GridPattern } from "./(components)/grid-pattern";

import { CanvasFrame } from "./(components)/canvas-frame";

const App: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { stageScale, stagePos, handleWheel } = useCanvasZoom();
  const { frames, updateFrame } = useFrames();
  const { shapes, updateShape } = useShapes();
  const stageRef = useRef<any>(null);

  const handleSelect = (id: string) => setSelectedId(id);

  const handleDeselect = (e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  return (
    <div
      style={{ fontFamily: "sans-serif", height: "100vh", overflow: "hidden" }}
    >
      <Header selectedId={selectedId} stageScale={stageScale} />

      <Stage
        ref={stageRef}
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight - 70 : 600}
        onMouseDown={handleDeselect}
        onTouchStart={handleDeselect}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        style={{ background: "#fafafa" }}
      >
        <Layer>
          <GridPattern />

          {frames.map((frame) => (
            <CanvasFrame
              key={frame.id}
              frame={frame}
              shapes={shapes.filter((s) => s.frameId === frame.id)}
              isSelected={selectedId === frame.id}
              onSelect={() => handleSelect(frame.id)}
              onUpdate={updateFrame}
              onShapeUpdate={updateShape}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
