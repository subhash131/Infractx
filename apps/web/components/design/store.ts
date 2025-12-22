import { create } from "zustand";
import * as fabric from "fabric";

interface CanvasState {
  canvas: fabric.Canvas | null;
  elements: fabric.FabricObject[];
  selectedElements: fabric.FabricObject[];
  zoom: number;
  pan: { x: number; y: number };
  mode: "select" | "rectangle" | "circle" | "text" | "line" | "pan";
  backgroundColor: string;
  showGrid: boolean;
  history: fabric.FabricObject[][];
  historyIndex: number;
  devicePixelRatio: number;
}

interface CanvasActions {
  setCanvas: (canvas: fabric.Canvas | null) => void;
  addElement: (element: fabric.FabricObject) => void;
  removeElement: (element: fabric.FabricObject) => void;
  updateElement: (element: fabric.FabricObject) => void;
  setSelectedElements: (elements: fabric.FabricObject[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setMode: (mode: CanvasState["mode"]) => void;
  setBackgroundColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  setDevicePixelRatio: (dpr: number) => void;
}

const useCanvas = create<CanvasState & CanvasActions>((set, get) => ({
  canvas: null,
  elements: [],
  selectedElements: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  mode: "select",
  backgroundColor: "#ffffff",
  showGrid: false,
  history: [],
  historyIndex: -1,
  devicePixelRatio: 1,

  setCanvas: (canvas) => set({ canvas }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
    })),

  removeElement: (element) =>
    set((state) => ({
      elements: state.elements.filter((el) => el !== element),
      selectedElements: state.selectedElements.filter((el) => el !== element),
    })),

  updateElement: (element) =>
    set((state) => ({
      elements: state.elements.map((el) => (el === element ? element : el)),
    })),

  setSelectedElements: (elements) => set({ selectedElements: elements }),

  setZoom: (zoom) => set({ zoom }),

  setPan: (pan) => set({ pan }),

  setMode: (mode) => set({ mode }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setShowGrid: (show) => set({ showGrid: show }),

  saveToHistory: () =>
    set((state) => {
      const currentState = state.canvas?.getObjects() || [];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...currentState]);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        state.canvas?.clear();
        prevState?.forEach((obj) => state.canvas?.add(obj));
        return { historyIndex: state.historyIndex - 1 };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        state.canvas?.clear();
        nextState?.forEach((obj) => state.canvas?.add(obj));
        return { historyIndex: state.historyIndex + 1 };
      }
      return state;
    }),

  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear();
      return {
        elements: [],
        selectedElements: [],
        history: [],
        historyIndex: -1,
      };
    }),
  setDevicePixelRatio: (dpr) => set({ devicePixelRatio: dpr }),
}));

export default useCanvas;
