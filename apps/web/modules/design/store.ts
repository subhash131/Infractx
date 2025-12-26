import { create } from "zustand";
import * as fabric from "fabric";

interface CanvasState {
  // Canvas instance
  canvas: fabric.Canvas | null;
  activeFileId: string | null;
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
  setActiveObject: (object: fabric.FabricObject) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setMode: (mode: CanvasState["mode"]) => void;
  setBackgroundColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  setActiveFileId: (fileId: string | null) => void;
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
  activeFileId: null,
  activePageId: null,

  setCanvas: (canvas) => set({ canvas }),

  setSelectedElements: (elements) => set({ selectedElements: elements }),

  setZoom: (zoom) => set({ zoom }),

  setPan: (pan) => set({ pan }),

  setMode: (mode) => set({ mode }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setShowGrid: (show) => set({ showGrid: show }),

  setActiveObject: (object) => set({ activeObject: object }),

  setActiveFileId: (fileId) => set({ activeFileId: fileId }),

  setActivePageId: (pageId) => set({ activePageId: pageId }),
}));

export default useCanvas;
