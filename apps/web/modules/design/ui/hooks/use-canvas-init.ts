import { useEffect, RefObject } from "react";
import * as fabric from "fabric";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants";
import { fonts } from "../components/design-tools/util";

export const useCanvasInit = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  canvas: fabric.Canvas | null,
  setCanvas: (canvas: fabric.Canvas | null) => void,
  setZoom: (zoom: number) => void
) => {
  useEffect(() => {
    // Load font
    const font = new FontFace("Poppins", `url(${fonts.poppins.url})`, {
      weight: "400",
      style: "normal",
    });
    (async () => {
      await font.load();
      document.fonts.add(font);
    })();

    if (canvasRef.current && !canvas) {
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

      initCanvas.setDimensions({
        width: viewportWidth,
        height: viewportHeight,
      });

      initCanvas.setZoom(scaleFactor);
      const vpt = initCanvas.viewportTransform!;
      vpt[4] = (viewportWidth - CANVAS_WIDTH * scaleFactor) / 2;
      vpt[5] = (viewportHeight - CANVAS_HEIGHT * scaleFactor) / 2;

      initCanvas.setViewportTransform(vpt);

      setCanvas(initCanvas);
      setZoom(scaleFactor);
      initCanvas.renderAll();
      

      // Return cleanup for THIS specific canvas instance
      return () => {
        initCanvas.dispose();
      };
    }
  }, [canvasRef]);

  return canvas;
};
