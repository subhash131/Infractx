import { create } from "zustand";
import * as fabric from "fabric";

interface CanvasState {
  // Canvas instance
  canvas: fabric.Canvas | null;
  activeDesignId: string | null;
  activePageId: string | null;

  // UI-only state (not persisted)
  selectedElements: fabric.FabricObject[];
  activeObject: fabric.FabricObject | null;
  zoom: number;
  pan: { x: number; y: number };
  mode: "select" | "rectangle" | "circle" | "text" | "line" | "pan";
  backgroundColor: string;
  showGrid: boolean;
}

interface CanvasActions {
  setCanvas: (canvas: fabric.Canvas | null) => void;
  setSelectedElements: (elements: fabric.FabricObject[]) => void;
  setActiveObject: (object: fabric.FabricObject | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setMode: (mode: CanvasState["mode"]) => void;
  setBackgroundColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  setActiveDesignId: (designId: string | null) => void;
  setActivePageId: (pageId: string | null) => void;
}

const useCanvas = create<CanvasState & CanvasActions>((set, get) => ({
  canvas: null,
  selectedElements: [],
  activeObject: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  mode: "select",
  backgroundColor: "#ffffff",
  showGrid: false,
  activeDesignId: null,
  activePageId: null,

  setCanvas: (canvas) => set({ canvas }),

  setSelectedElements: (elements) => set({ selectedElements: elements }),

  setZoom: (zoom) => set({ zoom }),

  setPan: (pan) => set({ pan }),

  setMode: (mode) => set({ mode }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setShowGrid: (show) => set({ showGrid: show }),

  setActiveObject: (object) => set({ activeObject: object }),

  setActiveDesignId: (designId) => set({ activeDesignId: designId }),

  setActivePageId: (pageId) => set({ activePageId: pageId }),
}));

export default useCanvas;
