import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import useCanvas from "../../store";

export const DesignCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { canvas, setCanvas } = useCanvas();

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      console.log("Initializing canvas...");
      console.log("Canvas element:", canvasRef.current);

      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: innerWidth,
        height: innerHeight,
        selectionBorderColor: "#4096ee",
        allowTouchScrolling: true,
      });

      console.log("Fabric canvas created:", initCanvas);
      console.log("Canvas element after init:", initCanvas.getElement());

      setCanvas(initCanvas);

      // Force initial render
      initCanvas.renderAll();
      initCanvas.requestRenderAll();

      console.log("Canvas initialized and rendered");

      // return () => {
      //   console.log("Disposing canvas...");
      //   initCanvas.dispose();
      // };
    }
  }, [canvasRef.current, canvas, setCanvas]);

  return (
    <canvas ref={canvasRef} id="canvas" className="border border-gray-200" />
  );
};
