import * as fabric from "fabric";
import { SnapDetector } from "./snap-detector";
import { SnapRenderer } from "./snap-renderer";
import { SnapGuide, SnapConfig, ObjectBounds } from "./types";
import { Frame } from "../../design-tools/frame";
import { Id } from "@workspace/backend/_generated/dataModel";

export class FrameSnapManager {
  private canvas: fabric.Canvas;
  private renderer: SnapRenderer;
  private activeGuides: SnapGuide[] = [];
  private activeFrame: Frame | null = null;

  private config: SnapConfig = {
    enabled: true,
    threshold: 5,
    showGuides: true,
    snapToCenter: true,
    snapToEdges: true,
  };

  constructor(canvas: fabric.Canvas, config?: Partial<SnapConfig>) {
    this.canvas = canvas;
    this.renderer = new SnapRenderer(canvas);
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.on("object:moving", this.handleObjectMoving);
    this.canvas.on("after:render", this.handleAfterRender);
    this.canvas.on("object:modified", this.handleObjectModified);
    this.canvas.on("selection:cleared", this.clearGuides);
  }

  private handleObjectMoving = (
    e: fabric.TEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }
  ) => {
    if (!this.config.enabled || !e.target) return;

    // Disable snapping when holding Cmd/Ctrl
    if (e.e?.metaKey || e.e?.ctrlKey) {
      this.clearGuides();
      return;
    }

    const movingObject = e.target;
    const frame = this.findParentFrame(movingObject);

    if (!frame) {
      this.clearGuides();
      return;
    }

    this.activeFrame = frame;
    this.checkAndSnap(movingObject, frame);
  };

  private handleAfterRender = () => {
    if (
      !this.activeFrame ||
      !this.config.showGuides ||
      this.activeGuides.length === 0
    ) {
      return;
    }

    this.renderer.drawGuides(this.activeGuides, this.activeFrame);
  };

  private handleObjectModified = () => {
    this.clearGuides();
  };

  private findParentFrame(obj: fabric.FabricObject): Frame | null {
    const objWithId = obj as any;

    if (!objWithId.parentLayerId) return null;

    let currentParentId: Id<"layers"> = objWithId.parentLayerId;

    while (currentParentId) {
      const parent = this.canvas
        .getObjects()
        .find((o: any) => o._id === currentParentId);

      if (!parent) break;

      if (parent.obj_type === "FRAME") {
        return parent as Frame;
      }

      currentParentId = parent.parentLayerId as Id<"layers">;
    }

    return null;
  }

  private getSnapDelta(
    current: number,
    target: number,
    threshold: number
  ): number | null {
    const diff = target - current;
    return Math.abs(diff) <= threshold ? diff : null;
  }

  private checkAndSnap(obj: fabric.FabricObject, frame: Frame) {
    this.activeGuides = [];

    const objBounds = SnapDetector.getBounds(obj);
    const frameBounds = SnapDetector.getBounds(frame);

    let snappedX = false;
    let snappedY = false;

    // ─── CENTER SNAP ─────────────────────────────
    if (this.config.snapToCenter) {
      const dx = this.getSnapDelta(
        objBounds.centerX,
        frameBounds.centerX,
        this.config.threshold
      );

      if (dx !== null) {
        obj.left! += dx;
        this.addGuide("vertical", frameBounds.centerX, "center", frameBounds);
        snappedX = true;
      }

      const dy = this.getSnapDelta(
        objBounds.centerY,
        frameBounds.centerY,
        this.config.threshold
      );

      if (dy !== null) {
        obj.top! += dy;
        this.addGuide("horizontal", frameBounds.centerY, "center", frameBounds);
        snappedY = true;
      }
    }

    // ─── EDGE SNAP ───────────────────────────────
    if (this.config.snapToEdges) {
      if (!snappedX) {
        const dxLeft = this.getSnapDelta(
          objBounds.left,
          frameBounds.left,
          this.config.threshold
        );

        if (dxLeft !== null) {
          obj.left! += dxLeft;
          this.addGuide("vertical", frameBounds.left, "edge", frameBounds);
        } else {
          const dxRight = this.getSnapDelta(
            objBounds.right,
            frameBounds.right,
            this.config.threshold
          );

          if (dxRight !== null) {
            obj.left! += dxRight;
            this.addGuide("vertical", frameBounds.right, "edge", frameBounds);
          }
        }
      }

      if (!snappedY) {
        const dyTop = this.getSnapDelta(
          objBounds.top,
          frameBounds.top,
          this.config.threshold
        );

        if (dyTop !== null) {
          obj.top! += dyTop;
          this.addGuide("horizontal", frameBounds.top, "edge", frameBounds);
        } else {
          const dyBottom = this.getSnapDelta(
            objBounds.bottom,
            frameBounds.bottom,
            this.config.threshold
          );

          if (dyBottom !== null) {
            obj.top! += dyBottom;
            this.addGuide(
              "horizontal",
              frameBounds.bottom,
              "edge",
              frameBounds
            );
          }
        }
      }
    }

    obj.setCoords();
  }

  private hasGuide(
    type: "vertical" | "horizontal",
    position: number,
    matchType: "edge" | "center"
  ) {
    return this.activeGuides.some(
      (g) =>
        g.type === type && g.position === position && g.matchType === matchType
    );
  }

  private addGuide(
    type: "vertical" | "horizontal",
    position: number,
    matchType: "edge" | "center",
    frameBounds: ObjectBounds
  ) {
    if (this.hasGuide(type, position, matchType)) return;

    this.activeGuides.push({
      type,
      position,
      matchType,
      color: this.renderer.getGuideColor(matchType),
      bounds: {
        start: type === "vertical" ? frameBounds.top : frameBounds.left,
        end: type === "vertical" ? frameBounds.bottom : frameBounds.right,
      },
    });
  }

  private clearGuides = () => {
    this.activeGuides = [];
    this.activeFrame = null;
    this.canvas.requestRenderAll();
  };

  // ─── Public API ───────────────────────────────
  public enable() {
    this.config.enabled = true;
  }

  public disable() {
    this.config.enabled = false;
    this.clearGuides();
  }

  public setConfig(config: Partial<SnapConfig>) {
    this.config = { ...this.config, ...config };
  }

  public destroy() {
    this.canvas.off("object:moving", this.handleObjectMoving);
    this.canvas.off("after:render", this.handleAfterRender);
    this.canvas.off("object:modified", this.handleObjectModified);
    this.canvas.off("selection:cleared", this.clearGuides);
    this.clearGuides();
  }
}
