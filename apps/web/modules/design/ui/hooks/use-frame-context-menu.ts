import { useEffect, useRef } from "react";
import * as fabric from "fabric";

interface UseFrameContextMenuProps {
  canvas: fabric.Canvas | null;
  onSaveAsTemplate: (frame: fabric.Object) => void;
}

export function useFrameContextMenu({
  canvas,
  onSaveAsTemplate,
}: UseFrameContextMenuProps) {
  const frameRef = useRef<fabric.Object | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const handler = (e: MouseEvent) => {
      e.preventDefault();

      const target = canvas.findTarget(e);
      if (!target || target.obj_type !== "FRAME") return;

      frameRef.current = target;

      window.dispatchEvent(
        new CustomEvent("frame-context-menu", {
          detail: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    };

    canvas.upperCanvasEl.addEventListener("contextmenu", handler);

    return () => {
      canvas.upperCanvasEl.removeEventListener("contextmenu", handler);
    };
  }, [canvas]);

  return {
    getFrame: () => frameRef.current,
    clearFrame: () => (frameRef.current = null),
  };
}
