import * as fabric from "fabric";
import { ObjectBounds } from "./types";
import { Frame } from "../../design-tools/frame";

export class SnapDetector {
  static getBounds(obj: fabric.FabricObject): ObjectBounds {
    const bounds = obj.getBoundingRect();
    const center = obj.getCenterPoint();

    return {
      left: bounds.left,
      right: bounds.left + bounds.width,
      width: bounds.width,
      height: bounds.height,
      top: bounds.top,
      bottom: bounds.top + bounds.height,
      centerX: center.x,
      centerY: center.y,
    };
  }

  static isNear(a: number, b: number, threshold: number): boolean {
    return Math.abs(a - b) < threshold;
  }

  static checkCenterXAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.centerX, frameBounds.centerX, threshold))
      console.log(
        "checkCenterXAlignment",
        this.isNear(objBounds.centerX, frameBounds.centerX, threshold)
      );

    return this.isNear(objBounds.centerX, frameBounds.centerX, threshold);
  }
  static checkCenterAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (
      this.isNear(objBounds.centerX, frameBounds.centerX, threshold) &&
      this.isNear(objBounds.centerY, frameBounds.centerY, threshold)
    )
      console.log(
        "checkCenterAlignment",
        this.isNear(objBounds.centerX, frameBounds.centerX, threshold) &&
          this.isNear(objBounds.centerY, frameBounds.centerY, threshold)
      );

    return (
      this.isNear(objBounds.centerX, frameBounds.centerX, threshold) &&
      this.isNear(objBounds.centerY, frameBounds.centerY, threshold)
    );
  }
  static getFrameLocalBounds(frame: Frame): ObjectBounds {
    const width = frame.getScaledWidth();
    const height = frame.getScaledHeight();

    const left = -width / 2;
    const right = width / 2;
    const top = -height / 2;
    const bottom = height / 2;

    return {
      left,
      right,
      top,
      bottom,
      centerX: 0,
      centerY: 0,
      width,
      height,
    };
  }

  static checkCenterYAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.centerY, frameBounds.centerY, threshold))
      console.log(
        "checkCenterYAlignment",
        this.isNear(objBounds.centerY, frameBounds.centerY, threshold)
      );
    return this.isNear(objBounds.centerY, frameBounds.centerY, threshold);
  }

  static checkLeftAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.left, frameBounds.left, threshold))
      console.log(
        "checkLeftAlignment",
        this.isNear(objBounds.left, frameBounds.left, threshold)
      );
    return this.isNear(objBounds.left, frameBounds.left, threshold);
  }

  static checkRightAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.right, frameBounds.right, threshold))
      console.log(
        "checkRightAlignment",
        this.isNear(objBounds.right, frameBounds.right, threshold)
      );
    return this.isNear(objBounds.right, frameBounds.right, threshold);
  }

  static checkTopAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.top, frameBounds.top, threshold))
      console.log(
        "checkTopAlignment",
        this.isNear(objBounds.top, frameBounds.top, threshold)
      );
    return this.isNear(objBounds.top, frameBounds.top, threshold);
  }

  static checkBottomAlignment(
    objBounds: ObjectBounds,
    frameBounds: ObjectBounds,
    threshold: number
  ): boolean {
    if (this.isNear(objBounds.bottom, frameBounds.bottom, threshold))
      console.log(
        "checkBottomAlignment",
        this.isNear(objBounds.bottom, frameBounds.bottom, threshold)
      );
    return this.isNear(objBounds.bottom, frameBounds.bottom, threshold);
  }
}
