import { create } from "zustand";
import * as fabric from "fabric";
import { Doc } from "@workspace/backend/_generated/dataModel";

type ActiveTool = Doc<"shapes">["type"] | "SELECT";

interface CanvasState {
  activeTool: ActiveTool;
}

interface CanvasActions {
  setActiveTool: (tool: ActiveTool) => void;
}

const useCanvas = create<CanvasState & CanvasActions>((set, get) => ({
  activeTool: "SELECT",
  setActiveTool: (tool) => set({ activeTool: tool }),
}));

export default useCanvas;
