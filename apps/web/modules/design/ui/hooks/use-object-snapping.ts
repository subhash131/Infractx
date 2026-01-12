import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { ObjectSnapManager } from "../components/snapping/utils/object-snap-manager";
import { ObjectSnapConfig } from "../components/snapping/utils/types";

export const useObjectSnapping = (
  canvas: fabric.Canvas | null,
  config?: Partial<ObjectSnapConfig>
) => {
  const managerRef = useRef<ObjectSnapManager | null>(null);

  useEffect(() => {
    if (!canvas) return;

    // Create snap manager
    managerRef.current = new ObjectSnapManager(canvas, config);

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [canvas]);

  return {
    enable: () => managerRef.current?.enable(),
    disable: () => managerRef.current?.disable(),
    setConfig: (newConfig: Partial<ObjectSnapConfig>) =>
      managerRef.current?.setConfig(newConfig),
    setPriority: (priority: any) => managerRef.current?.setPriority(priority),
  };
};
