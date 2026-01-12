import * as fabric from "fabric";
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

    // Frame's LOCAL bounds (centered at 0,0)
    const frameLocalBounds = {
      left: -frame.width! / 2, // -400
      right: frame.width! / 2, // 400
      top: -frame.height! / 2, // -300
      bottom: frame.height! / 2, // 300
      centerX: 0,
      centerY: 0,
      width: frame.width!,
      height: frame.height!,
    };

    // Object's LOCAL bounds (obj.left/top are already local!)
    const objWidth = obj.getScaledWidth();
    const objHeight = obj.getScaledHeight();

    const objLocalBounds = {
      left: obj.left!,
      top: obj.top!,
      width: objWidth,
      height: objHeight,
      right: obj.left! + objWidth,
      bottom: obj.top! + objHeight,
      centerX: obj.left! + objWidth / 2,
      centerY: obj.top! + objHeight / 2,
    };

    let snappedX = false;
    let snappedY = false;

    // CENTER SNAP
    if (this.config.snapToCenter) {
      // Check if object center is near frame center (0, 0)
      const dx = this.getSnapDelta(
        objLocalBounds.centerX,
        0, // Frame center X in local coords
        this.config.threshold
      );

      if (dx !== null) {
        obj.set({ left: obj.left! + dx });
        this.addGuide("vertical", 0, "center", frameLocalBounds);
        snappedX = true;
      }

      const dy = this.getSnapDelta(
        objLocalBounds.centerY,
        0, // Frame center Y in local coords
        this.config.threshold
      );

      if (dy !== null) {
        obj.set({ top: obj.top! + dy });
        this.addGuide("horizontal", 0, "center", frameLocalBounds);
        snappedY = true;
      }
    }

    // EDGE SNAP
    if (this.config.snapToEdges) {
      if (!snappedX) {
        // Left edge: obj.left should be at -width/2
        const dxLeft = this.getSnapDelta(
          objLocalBounds.left,
          frameLocalBounds.left,
          this.config.threshold
        );

        if (dxLeft !== null) {
          obj.set({ left: obj.left! + dxLeft });
          this.addGuide(
            "vertical",
            frameLocalBounds.left,
            "edge",
            frameLocalBounds
          );
        } else {
          // Right edge: obj.right should be at width/2
          const dxRight = this.getSnapDelta(
            objLocalBounds.right,
            frameLocalBounds.right,
            this.config.threshold
          );

          if (dxRight !== null) {
            obj.set({ left: obj.left! + dxRight });
            this.addGuide(
              "vertical",
              frameLocalBounds.right,
              "edge",
              frameLocalBounds
            );
          }
        }
      }

      if (!snappedY) {
        // Top edge: obj.top should be at -height/2
        const dyTop = this.getSnapDelta(
          objLocalBounds.top,
          frameLocalBounds.top,
          this.config.threshold
        );

        if (dyTop !== null) {
          obj.set({ top: obj.top! + dyTop });
          this.addGuide(
            "horizontal",
            frameLocalBounds.top,
            "edge",
            frameLocalBounds
          );
        } else {
          // Bottom edge: obj.bottom should be at height/2
          const dyBottom = this.getSnapDelta(
            objLocalBounds.bottom,
            frameLocalBounds.bottom,
            this.config.threshold
          );

          if (dyBottom !== null) {
            obj.set({ top: obj.top! + dyBottom });
            this.addGuide(
              "horizontal",
              frameLocalBounds.bottom,
              "edge",
              frameLocalBounds
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
    position: number, // This is in LOCAL coords (e.g., 0, -400, 400)
    matchType: "edge" | "center",
    frameLocalBounds: ObjectBounds
  ) {
    if (this.hasGuide(type, position, matchType)) return;

    this.activeGuides.push({
      type,
      position, // Store local position
      matchType,
      color: this.renderer.getGuideColor(matchType),
      bounds: {
        // Guide line spans full frame in local coords
        start:
          type === "vertical" ? frameLocalBounds.top : frameLocalBounds.left,
        end:
          type === "vertical"
            ? frameLocalBounds.bottom
            : frameLocalBounds.right,
      },
    });
  }

  private clearGuides = () => {
    this.activeGuides = [];
    this.activeFrame = null;
    this.canvas.requestRenderAll();
  };

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
