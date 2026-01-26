import { create } from "zustand";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import Konva from "konva";

export type ActiveTool = Doc<"shapes">["type"] | "SELECT";

interface CanvasState {
  activeTool: ActiveTool;
  activeShapeId?: Id<"shapes">;
  selectedShapeIds: Id<"shapes">[];
  stage?: Konva.Stage;
}

interface CanvasActions {
  setActiveTool: (tool: ActiveTool) => void;
  setActiveShapeId: (shapeId?: Id<"shapes">) => void;
  setSelectedShapeIds: (shapeIds: Id<"shapes">[]) => void;
  toggleSelectedShapeId: (shapeId: Id<"shapes">) => void;
  clearSelectedShapeIds: () => void;
  setStage: (stage: Konva.Stage) => void;
}

const useCanvas = create<CanvasState & CanvasActions>((set) => ({
  activeTool: "SELECT",
  activeShapeId: undefined,
  stage: undefined,
  selectedShapeIds: [],

  setActiveTool: (tool) => set({ activeTool: tool }),

  setActiveShapeId: (shapeId) => set({ activeShapeId: shapeId }),

  // Set the specific list (useful after Grouping to select the new group)
  setSelectedShapeIds: (shapeIds) => set({ selectedShapeIds: shapeIds }),

  // Handles Shift+Click logic (Add if missing, Remove if present)
  toggleSelectedShapeId: (id) =>
    set((state) => {
      const exists = state.selectedShapeIds.includes(id);
      return {
        selectedShapeIds: exists
          ? state.selectedShapeIds.filter((item) => item !== id)
          : [...state.selectedShapeIds, id],
      };
    }),

  setStage: (stage) => set({ stage }),

  clearSelectedShapeIds: () => set({ selectedShapeIds: [] }),
}));

export default useCanvas;
