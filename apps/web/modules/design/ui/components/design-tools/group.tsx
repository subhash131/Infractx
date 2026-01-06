import * as fabric from "fabric";

export class DesignGroup extends fabric.Group {
  declare obj_type: "GROUP";

  childInteractionEnabled: boolean = false;

  constructor(objects: fabric.FabricObject[], options?: any) {
    super(objects, {
      ...options,
      originX: "left",
      originY: "top",
      obj_type: "GROUP",
      subTargetCheck: true,
    });

    this.obj_type = "GROUP";
    this.on("mousedblclick", (opt) => {
      const target = opt.subTargets?.[0] || opt.target;
      if (!target) return;
      this.canvas?.setActiveObject(target);
      this.childInteractionEnabled = true;
    });
    this.on("deselected", () => {
      this.childInteractionEnabled = false;
    });

    this.on("mousedown", (opt) => {
      const canvas = this.canvas;
      const target = opt.subTargets?.[0];

      if (!canvas || !target || !this.childInteractionEnabled) return;

      canvas._setupCurrentTransform(opt.e, target, true);

      canvas.requestRenderAll();
    });
  }

  /** Create group from selection, inheriting parent from children */
  static createFromSelection(
    selection: fabric.ActiveSelection,
    groupId: string,
    parentObject?: fabric.Group
  ) {
    const children = selection.getObjects();
    const bounds = selection.getBoundingRect();

    // Check if all children have the same parent
    const firstParent = (children[0] as any).parentLayerId;
    const hasCommonParent = children.every(
      (obj: any) => obj.parentLayerId === firstParent
    );

    // If they all share a parent, the group should inherit it
    const parentLayerId = hasCommonParent ? firstParent : undefined;

    // Calculate group position relative to parent
    let groupLeft = bounds.left;
    let groupTop = bounds.top;

    if (parentObject) {
      // Convert canvas coordinates to parent-local coordinates
      // Parent's center is at (0, 0) in its local space
      const parentCenter = parentObject.getCenterPoint();
      groupLeft = bounds.left - parentCenter.x;
      groupTop = bounds.top - parentCenter.y;
    }

    children.forEach((obj) => {
      obj.set({
        left: obj.left! - bounds.left,
        top: obj.top! - bounds.top,
        evented: true,
        selectable: true,
      });

      obj.setOnGroup();
      obj.setCoords();
    });

    const group = new DesignGroup(children, {
      left: groupLeft,
      top: groupTop,
      _id: groupId,
      parentLayerId, // Inherit parent from children
    });

    group.setCoords();
    return { group, children, parentLayerId };
  }

  /** Ungroup to canvas, children inherit the group's parent */
  ungroupToCanvas(canvas: fabric.Canvas, parentObject?: fabric.Group) {
    const children = this.getObjects();
    const groupMatrix = this.calcTransformMatrix();

    // Children should inherit the group's parent
    const parentLayerId = (this as any).parentLayerId;

    children.forEach((obj) => {
      const absolute = new fabric.Point(obj.left ?? 0, obj.top ?? 0).transform(
        groupMatrix
      );

      let finalLeft = absolute.x;
      let finalTop = absolute.y;

      if (parentObject) {
        // Convert canvas coordinates to parent-local coordinates
        const parentCenter = parentObject.getCenterPoint();
        finalLeft = absolute.x - parentCenter.x;
        finalTop = absolute.y - parentCenter.y;
      }

      obj.set({
        left: finalLeft,
        top: finalTop,
      });

      // Inherit parent from group
      (obj as any).parentLayerId = parentLayerId;

      obj.setCoords();
    });

    canvas.remove(this);
    canvas.add(...children);

    return { children, parentLayerId };
  }
}
