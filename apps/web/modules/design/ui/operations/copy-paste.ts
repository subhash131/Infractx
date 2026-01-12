import * as fabric from "fabric";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { ReactMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export const handleCopy = async (
  activeObject: fabric.FabricObject,
  copiedObjectRef: React.RefObject<fabric.FabricObject | null>
) => {
  copiedObjectRef.current = await activeObject.clone();

  copiedObjectRef.current.set({
    parentLayerId: activeObject?.parentLayerId,
    obj_type: activeObject?.obj_type,
    text: activeObject?.text,
    fontFamily: activeObject?.fontFamily,
    fontSize: activeObject?.fontSize,
    fontStyle: activeObject?.fontStyle,
    fontWeight: activeObject?.fontWeight,
    fill: activeObject?.fill,
    linethrough: activeObject?.linethrough,
    textAlign: activeObject?.textAlign,
    underline: activeObject?.underline,
    points: activeObject?.points,
    radius: activeObject?.radius,
  });
};

export const handlePaste = async (
  copiedObjectRef: React.RefObject<fabric.FabricObject | null>,
  canvas: fabric.Canvas,
  activePageId: Id<"pages">,
  createObject: ReactMutation<typeof api.design.layers.createObject>
) => {
  if (!copiedObjectRef.current) return;

  const cloned = copiedObjectRef.current;

  cloned.set({
    left: (cloned.left || 0) + 20,
    top: (cloned.top || 0) + 20,
    _id: undefined,
  });

  canvas.discardActiveObject();

  const objType = cloned.obj_type;
  const parentLayerId = cloned.parentLayerId;
  if (!objType) return;

  const layerData: Omit<
    Doc<"layers">,
    "_id" | "createdAt" | "_creationTime" | "updatedAt"
  > = {
    pageId: activePageId,
    type: objType,
    name: cloned.name || `${objType} Copy`,
    left: cloned.left,
    top: cloned.top,
    width: cloned.width,
    height: cloned.height,
    angle: cloned.angle,
    opacity: cloned.opacity,
    fill: cloned.fill?.toString(),
    stroke: cloned.stroke?.toString(),
    strokeWidth: cloned.strokeWidth,
    parentLayerId: cloned?.parentLayerId,
    text: cloned?.text,
    fontFamily: cloned?.fontFamily,
    fontSize: cloned?.fontSize,
    fontStyle: cloned?.fontStyle,
    fontWeight: cloned?.fontWeight,
    linethrough: cloned?.linethrough,
    textAlign: cloned?.textAlign,
    underline: cloned?.underline,
    points: cloned?.points,
    radius: cloned?.radius,
    scaleX: cloned.scaleX,
    scaleY: cloned.scaleY,
  };

  const newId = await createObject({ layerObject: layerData });
  cloned.set({ _id: newId });

  let parentObject: fabric.Group | undefined = undefined;
  if (parentLayerId) {
    parentObject = canvas
      .getObjects()
      .find((obj) => obj._id === parentLayerId) as fabric.Group;
  }

  if (parentObject) {
    parentObject.add(cloned);
  } else {
    canvas.add(cloned);
  }

  canvas.setActiveObject(cloned);
  canvas.requestRenderAll();

  copiedObjectRef.current = cloned;
};
