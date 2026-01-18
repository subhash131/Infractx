import * as fabric from "fabric";
import { Id } from "@workspace/backend/_generated/dataModel";
import { DesignGroup } from "../components/design-tools/group";
import { ReactMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export const handleGroup = async (
  activeObject: fabric.ActiveSelection,
  canvas: fabric.Canvas,
  activePageId: Id<"pages">,
  createObject: ReactMutation<typeof api.design.layers.createObject>,
  updateObject: ReactMutation<typeof api.design.layers.updateObject>,
) => {
  const selection = activeObject;
  const firstChild = selection.getObjects()[0];
  const parentLayerId = firstChild?.parentLayerId;
  let parentObject: fabric.Group | undefined = undefined;

  if (parentLayerId) {
    parentObject = canvas
      .getObjects()
      .find((obj) => obj._id === parentLayerId) as fabric.Group;
  }

  const {
    group,
    children,
    parentLayerId: inheritedParentId,
  } = DesignGroup.createFromSelection(selection, "", parentObject);

  const { _id: groupId } = await createObject({
    layerObject: {
      pageId: activePageId,
      type: "GROUP",
      name: "Group",
      left: group.left,
      top: group.top,
      width: group.width,
      height: group.height,
      parentLayerId: inheritedParentId,
    },
  });

  group.set({ _id: groupId, opacity: 0 });

  await Promise.all(
    children.map((obj) =>
      updateObject({
        _id: obj._id as Id<"layers">,
        parentLayerId: groupId,
        left: obj.left,
        top: obj.top,
      }),
    ),
  );

  canvas.remove(...children);

  if (parentObject && typeof parentObject.add === "function") {
    parentObject.add(group);
  } else {
    canvas.add(group);
  }

  canvas.setActiveObject(group);
  canvas.requestRenderAll();
};

export const handleUngroup = async (
  activeObject: DesignGroup,
  canvas: fabric.Canvas,
  updateObject: ReactMutation<typeof api.design.layers.updateObject>,
  removeObject: ReactMutation<typeof api.design.layers.deleteObject>,
) => {
  const group = activeObject;
  const parentLayerId = group.parentLayerId;
  let parentObject: fabric.Group | undefined = undefined;

  if (parentLayerId) {
    parentObject = canvas
      .getObjects()
      .find((obj) => obj._id === parentLayerId) as fabric.Group;
  }

  const { children, parentLayerId: inheritedParentId } = group.ungroupToCanvas(
    canvas,
    parentObject,
  );

  group.set({ opacity: 0 });

  await Promise.all(
    children.map((obj) =>
      updateObject({
        _id: obj._id as Id<"layers">,
        parentLayerId: inheritedParentId,
        left: obj.left,
        top: obj.top,
      }),
    ),
  );

  await removeObject({ id: group._id as Id<"layers"> });

  if (parentObject && typeof parentObject.add === "function") {
    children.forEach((child) => {
      parentObject.add(child);
    });
  }

  const selection = new fabric.ActiveSelection(children, { canvas });
  canvas.setActiveObject(selection);
  canvas.requestRenderAll();
  requestAnimationFrame(() => {
    group.set({ opacity: 1 });
  });
};
