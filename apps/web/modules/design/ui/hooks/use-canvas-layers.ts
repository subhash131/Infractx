import { useEffect } from "react";
import * as fabric from "fabric";
import { createFabricObject } from "../components/design-tools/tool-factory";
import { Doc } from "@workspace/backend/_generated/dataModel";
import useCanvas from "../../store";

export const useCanvasLayers = (
  canvas: fabric.Canvas | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  layers: Doc<"layers">[],
  page: Doc<"pages">
) => {
  const { activeObject } = useCanvas();
  useEffect(() => {
    if (!canvas || !canvasRef.current) return;

    canvas.clear();
    canvas.renderOnAddRemove = false;
    canvas.backgroundColor = page?.bgColor || "#d9d9d9";

    layers?.forEach((layer) => {
      const fabricObj = createFabricObject(layer);

      if (fabricObj) {
        canvas.add(fabricObj);

        // Apply child positions AFTER adding to canvas
        if (fabricObj._pendingChildPositions) {
          fabricObj._pendingChildPositions.forEach(({ obj, left, top }) => {
            obj.setCoords();
            obj.set({ left, top });
            if (activeObject?._id === obj._id) {
              canvas.setActiveObject(obj);
            }
          });
          fabricObj._pendingChildPositions = [];
        }

        if (activeObject?._id === fabricObj._id) {
          canvas.setActiveObject(fabricObj);
        }
      }
    });

    canvas.renderOnAddRemove = true;
    canvas.requestRenderAll();
  }, [layers, canvas, canvasRef, page, activeObject]);
};
