import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { FrameSnapManager } from "../components/snapping/utils/frame-snap-manager";
import { SnapConfig } from "../components/snapping/utils/types";

export const useFrameSnapping = (
  canvas: fabric.Canvas | null,
  config?: Partial<SnapConfig>
) => {
  const managerRef = useRef<FrameSnapManager | null>(null);

  useEffect(() => {
    if (!canvas) return;

    // Create snap manager
    managerRef.current = new FrameSnapManager(canvas, config);

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
    setConfig: (newConfig: Partial<SnapConfig>) =>
      managerRef.current?.setConfig(newConfig),
  };
};
