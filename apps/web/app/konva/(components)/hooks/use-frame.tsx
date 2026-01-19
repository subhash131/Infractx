import { useState } from "react";
import { FrameData } from "../types";

export const useFrames = () => {
  const [frames, setFrames] = useState<FrameData[]>([
    { id: "1", x: 50, y: 50, width: 300, height: 200, fill: "#e3f2fd" },
    { id: "2", x: 400, y: 50, width: 250, height: 180, fill: "#fff3e0" },
    { id: "3", x: 50, y: 300, width: 400, height: 250, fill: "#f3e5f5" },
    { id: "4", x: 700, y: 200, width: 200, height: 150, fill: "#e8f5e9" },
    { id: "5", x: 200, y: 600, width: 280, height: 180, fill: "#fce4ec" },
    { id: "6", x: 900, y: 500, width: 220, height: 200, fill: "#fff9c4" },
  ]);

  // Will become: const frames = useQuery(api.frames.list);

  const updateFrame = (id: string, attrs: Partial<FrameData>) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...attrs } : f)),
    );
    // Will become: updateFrameMutation({ id, ...attrs });
  };

  return { frames, updateFrame };
};
