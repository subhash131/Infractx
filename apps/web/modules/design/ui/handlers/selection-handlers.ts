import * as fabric from "fabric";

export const createSelectionHandlers = (
  canvas: fabric.Canvas,
  setSelectedElements: (elements: fabric.FabricObject[]) => void
) => {
  const applyCornerStyle = () => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.set({
      cornerColor: "#4096ee",
      cornerSize: 8,
      cornerStrokeColor: "#4096ee",
      borderColor: "#4096ee",
      borderScaleFactor: 1,
      transparentCorners: false,
    });

    canvas.requestRenderAll();
  };

  const handleSelectionCreated = (
    e: Partial<fabric.TEvent<fabric.TPointerEvent>> & {
      selected: fabric.FabricObject[];
    }
  ) => {
    const selected = e.selected || [];

    setSelectedElements(selected);
    applyCornerStyle();
  };

  const handleSelectionUpdated = (e: Partial<fabric.TEvent<fabric.TPointerEvent>> & {
      selected: fabric.FabricObject[];
    }) => {
    const selected = e.selected || [];
    setSelectedElements(selected);
    applyCornerStyle();
  };

  const handleSelectionCleared = () => {
    setSelectedElements([]);
  };

  return {
    handleSelectionCreated,
    handleSelectionUpdated,
    handleSelectionCleared,
    applyCornerStyle,
  };
};
