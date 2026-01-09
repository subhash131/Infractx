import * as fabric from "fabric";
import { Frame } from "../design-tools/frame";
import { DesignGroup } from "../design-tools/group";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

type LayersTree = FunctionReturnType<typeof api.design.layers.getLayersByPage>;
type LayerNode = LayersTree[number] & {
  children?: LayerNode[];
};

export const createFabricObject = (
  layer: LayerNode
): fabric.FabricObject | null => {
  let fabricObj: fabric.FabricObject | null = null;
  const { type, fontWeight, ...obj } = layer;

  switch (type) {
    case "RECT":
      fabricObj = new fabric.Rect({
        ...obj,
        obj_type: type,
        absolutePositioned: false,
      } as fabric.TOptions<fabric.RectProps>);
      break;

    case "CIRCLE":
      fabricObj = new fabric.Circle({
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.CircleProps>);
      break;

    case "LINE":
      fabricObj = new fabric.Polyline(layer.points || [], {
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.RectProps>);
      break;

    case "TEXT":
      fabricObj = new fabric.IText(obj.text || "Text", {
        ...obj,
        obj_type: type,
        fontFamily: "Poppins",
        padding: 4,
        editingBorderColor: "#646464",
        shadow: obj.shadow ? new fabric.Shadow(obj.shadow) : undefined,
        linethrough: obj.linethrough ? obj.linethrough.toString() : "false",
      }) as fabric.FabricObject<Partial<fabric.FabricObjectProps>>;
      break;

    case "GROUP": {
      const children: fabric.FabricObject[] = [];
      layer.children?.forEach((childLayer) => {
        const child = createFabricObject(childLayer);
        if (child) children.push(child);
      });
      fabricObj = new DesignGroup(children, { ...obj, _id: layer._id });
      break;
    }

    case "FRAME": {
      const childObjects: fabric.FabricObject[] = [];
      const childPositions: Array<{
        obj: fabric.FabricObject;
        left: number;
        top: number;
      }> = [];

      if (layer.children && layer.children.length > 0) {
        layer.children.forEach((childLayer) => {
          const childObj = createFabricObject(childLayer);
          if (childObj) {
            childPositions.push({
              obj: childObj,
              left: childObj.left,
              top: childObj.top,
            });
            childObjects.push(childObj);
          }
        });
      }

      fabricObj = new Frame(childObjects, {
        ...obj,
        obj_type: type,
      } as fabric.TOptions<fabric.RectProps>);

      (fabricObj as any)._pendingChildPositions = childPositions;
      break;
    }
  }

  if (fabricObj) {
    fabricObj.set({
      _id: layer._id,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
  }

  return fabricObj;
};
