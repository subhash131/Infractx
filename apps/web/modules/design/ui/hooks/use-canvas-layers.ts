import { useEffect } from "react";
import * as fabric from "fabric";
import { createFabricObject } from "../components/design-tools/tool-factory";
import { Doc } from "@workspace/backend/_generated/dataModel";
import useCanvas from "../../store";
import { RecursiveLayer } from "../components/snapping/utils/types";

export const useCanvasLayers = (
  canvas: fabric.Canvas | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  layers: RecursiveLayer | undefined,
  page: Doc<"pages">
) => {
  const { activeObject } = useCanvas();

  useEffect(() => {
    if (!canvas || !canvasRef.current) return;
    if (!layers || layers.length === 0) {
      canvas.clear();
      canvas.requestRenderAll();
      return;
    }

    let cancelled = false;

    const loadLayers = async () => {
      canvas.clear();
      canvas.renderOnAddRemove = false;

      canvas.backgroundColor = page?.bgColor || "#d9d9d9";

      const objects = (
        await Promise.all(layers.map(createFabricObject))
      ).filter(Boolean) as fabric.FabricObject[];

      if (cancelled) return;

      canvas.add(...objects);

      // Apply FRAME child positions
      objects.forEach((obj) => {
        if (obj._pendingChildPositions?.length) {
          obj._pendingChildPositions.forEach(({ obj: child, left, top }) => {
            child.set({ left, top });
            child.setCoords();

            if (activeObject?._id === child._id) {
              child.setCoords();
              canvas.setActiveObject(child);
            }
          });
          obj._pendingChildPositions = [];
        }

        if (activeObject?._id === obj._id) {
          obj.setCoords();
          canvas.setActiveObject(obj);
        }
      });

      canvas.renderOnAddRemove = true;
      canvas.requestRenderAll();
    };

    loadLayers();

    return () => {
      cancelled = true;
    };
  }, [layers, canvas, canvasRef, page]);
};
