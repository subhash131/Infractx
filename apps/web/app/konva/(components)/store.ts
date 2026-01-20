import { create } from "zustand";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";

export type ActiveTool = Doc<"shapes">["type"] | "SELECT";

interface CanvasState {
  activeTool: ActiveTool;
  activeShapeId?: Id<"shapes">;
}

interface CanvasActions {
  setActiveTool: (tool: ActiveTool) => void;
  setActiveShapeId: (shapeId?: Id<"shapes">) => void;
}

const useCanvas = create<CanvasState & CanvasActions>((set, get) => ({
  activeTool: "SELECT",
  activeShapeId: undefined,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveShapeId: (shapeId) => set({ activeShapeId: shapeId }),
}));

export default useCanvas;
