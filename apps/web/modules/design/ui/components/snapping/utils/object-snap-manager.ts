import * as fabric from "fabric";
import {
  ObjectBounds,
  ObjectSnapConfig,
  ObjectSnapGuide,
  ObjectSnapPriority,
  SnapCandidate,
} from "./types";
import { SnapRenderer } from "./snap-renderer";

export class ObjectSnapManager {
  private canvas: fabric.Canvas;
  private renderer: SnapRenderer;
  private activeGuides: ObjectSnapGuide[] = [];

  private config: ObjectSnapConfig = {
    enabled: true,
    threshold: 5,
    maxNearbyObjects: 4,
    showGuides: true,
    priority: {
      edgeToEdge: 1, // Highest priority (touching edges)
      edgeAligned: 2, // Aligned edges
      center: 3, // Center alignment
      edgeToCenter: 4, // Edge to center (lowest)
    },
  };

  constructor(canvas: fabric.Canvas, config?: Partial<ObjectSnapConfig>) {
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
    this.checkAndSnapToObjects(movingObject);
  };

  private handleAfterRender = () => {
    if (!this.config.showGuides || this.activeGuides.length === 0) {
      return;
    }

    this.drawObjectGuides();
  };

  private handleObjectModified = () => {
    this.clearGuides();
  };

  private getNearestNeighbors(
    movingObject: fabric.FabricObject,
    allObjects: fabric.FabricObject[]
  ): fabric.FabricObject[] {
    const movingBounds = this.getGlobalBounds(movingObject);
    const movingId = (movingObject as any)._id;

    // Calculate distances to all objects
    const objectsWithDistance = allObjects
      .filter((obj) => {
        const objId = (obj as any)._id;
        // Skip the moving object itself
        if (objId === movingId) return false;
        // Skip frames
        if ((obj as any).obj_type === "FRAME") return false;
        return true;
      })
      .map((obj) => {
        const objBounds = this.getGlobalBounds(obj);
        const distance = Math.sqrt(
          Math.pow(movingBounds.centerX - objBounds.centerX, 2) +
            Math.pow(movingBounds.centerY - objBounds.centerY, 2)
        );
        return { obj, distance };
      });

    // Sort by distance and take top N
    return objectsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.config.maxNearbyObjects)
      .map((item) => item.obj);
  }

  private getPotentialObjects(
    movingObject: fabric.FabricObject
  ): fabric.FabricObject[] {
    const parentLayerId = (movingObject as any).parentLayerId;

    if (parentLayerId) {
      const parentFrame = this.canvas
        .getObjects()
        .find((obj: any) => obj._id === parentLayerId);

      if (parentFrame && parentFrame instanceof fabric.Group) {
        return parentFrame
          .getObjects()
          .filter((obj: any) => obj._id !== (movingObject as any)._id);
      }

      return [];
    } else {
      // No parent: get all canvas-level objects (no parent)
      return this.canvas
        .getObjects()
        .filter(
          (obj) =>
            !(obj as any).parentLayerId && (obj as any).obj_type !== "FRAME"
        );
    }
  }

  private getGlobalBounds(obj: fabric.FabricObject): ObjectBounds {
    const bounds = obj.getBoundingRect();
    const center = obj.getCenterPoint();

    return {
      left: bounds.left,
      right: bounds.left + bounds.width,
      top: bounds.top,
      bottom: bounds.top + bounds.height,
      centerX: center.x,
      centerY: center.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  private checkAllAlignments(
    movingBounds: ObjectBounds,
    neighborBounds: ObjectBounds,
    neighbor: fabric.FabricObject
  ): SnapCandidate[] {
    const candidates: SnapCandidate[] = [];
    const threshold = this.config.threshold;

    // HORIZONTAL (X-axis) alignments

    // 1. Edge-to-edge: moving.right → neighbor.left (touching horizontally)
    const rightToLeft = neighborBounds.left - movingBounds.right;
    if (Math.abs(rightToLeft) <= threshold) {
      candidates.push({
        axis: "x",
        delta: rightToLeft,
        position: neighborBounds.left,
        matchType: "edge-to-edge",
        priority: this.config.priority.edgeToEdge,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.top, neighborBounds.top),
        guideEnd: Math.max(movingBounds.bottom, neighborBounds.bottom),
      });
    }

    // 2. Edge-to-edge: moving.left → neighbor.right (touching horizontally)
    const leftToRight = neighborBounds.right - movingBounds.left;
    if (Math.abs(leftToRight) <= threshold) {
      candidates.push({
        axis: "x",
        delta: leftToRight,
        position: neighborBounds.right,
        matchType: "edge-to-edge",
        priority: this.config.priority.edgeToEdge,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.top, neighborBounds.top),
        guideEnd: Math.max(movingBounds.bottom, neighborBounds.bottom),
      });
    }

    // 3. Edge-aligned: moving.left → neighbor.left
    const leftToLeft = neighborBounds.left - movingBounds.left;
    if (Math.abs(leftToLeft) <= threshold) {
      candidates.push({
        axis: "x",
        delta: leftToLeft,
        position: neighborBounds.left,
        matchType: "edge-aligned",
        priority: this.config.priority.edgeAligned,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.top, neighborBounds.top),
        guideEnd: Math.max(movingBounds.bottom, neighborBounds.bottom),
      });
    }

    // 4. Edge-aligned: moving.right → neighbor.right
    const rightToRight = neighborBounds.right - movingBounds.right;
    if (Math.abs(rightToRight) <= threshold) {
      candidates.push({
        axis: "x",
        delta: rightToRight,
        position: neighborBounds.right,
        matchType: "edge-aligned",
        priority: this.config.priority.edgeAligned,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.top, neighborBounds.top),
        guideEnd: Math.max(movingBounds.bottom, neighborBounds.bottom),
      });
    }

    // 5. Center: moving.centerX → neighbor.centerX
    const centerXToCenterX = neighborBounds.centerX - movingBounds.centerX;
    if (Math.abs(centerXToCenterX) <= threshold) {
      candidates.push({
        axis: "x",
        delta: centerXToCenterX,
        position: neighborBounds.centerX,
        matchType: "center",
        priority: this.config.priority.center,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.top, neighborBounds.top),
        guideEnd: Math.max(movingBounds.bottom, neighborBounds.bottom),
      });
    }

    // VERTICAL (Y-axis) alignments

    // 6. Edge-to-edge: moving.bottom → neighbor.top (touching vertically)
    const bottomToTop = neighborBounds.top - movingBounds.bottom;
    if (Math.abs(bottomToTop) <= threshold) {
      candidates.push({
        axis: "y",
        delta: bottomToTop,
        position: neighborBounds.top,
        matchType: "edge-to-edge",
        priority: this.config.priority.edgeToEdge,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.left, neighborBounds.left),
        guideEnd: Math.max(movingBounds.right, neighborBounds.right),
      });
    }

    // 7. Edge-to-edge: moving.top → neighbor.bottom (touching vertically)
    const topToBottom = neighborBounds.bottom - movingBounds.top;
    if (Math.abs(topToBottom) <= threshold) {
      candidates.push({
        axis: "y",
        delta: topToBottom,
        position: neighborBounds.bottom,
        matchType: "edge-to-edge",
        priority: this.config.priority.edgeToEdge,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.left, neighborBounds.left),
        guideEnd: Math.max(movingBounds.right, neighborBounds.right),
      });
    }

    // 8. Edge-aligned: moving.top → neighbor.top
    const topToTop = neighborBounds.top - movingBounds.top;
    if (Math.abs(topToTop) <= threshold) {
      candidates.push({
        axis: "y",
        delta: topToTop,
        position: neighborBounds.top,
        matchType: "edge-aligned",
        priority: this.config.priority.edgeAligned,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.left, neighborBounds.left),
        guideEnd: Math.max(movingBounds.right, neighborBounds.right),
      });
    }

    // 9. Edge-aligned: moving.bottom → neighbor.bottom
    const bottomToBottom = neighborBounds.bottom - movingBounds.bottom;
    if (Math.abs(bottomToBottom) <= threshold) {
      candidates.push({
        axis: "y",
        delta: bottomToBottom,
        position: neighborBounds.bottom,
        matchType: "edge-aligned",
        priority: this.config.priority.edgeAligned,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.left, neighborBounds.left),
        guideEnd: Math.max(movingBounds.right, neighborBounds.right),
      });
    }

    // 10. Center: moving.centerY → neighbor.centerY
    const centerYToCenterY = neighborBounds.centerY - movingBounds.centerY;
    if (Math.abs(centerYToCenterY) <= threshold) {
      candidates.push({
        axis: "y",
        delta: centerYToCenterY,
        position: neighborBounds.centerY,
        matchType: "center",
        priority: this.config.priority.center,
        targetObject: neighbor,
        guideStart: Math.min(movingBounds.left, neighborBounds.left),
        guideEnd: Math.max(movingBounds.right, neighborBounds.right),
      });
    }

    return candidates;
  }

  private checkAndSnapToObjects(movingObject: fabric.FabricObject) {
    this.activeGuides = [];

    const potentialObjects = this.getPotentialObjects(movingObject);
    const nearestNeighbors = this.getNearestNeighbors(
      movingObject,
      potentialObjects
    );

    if (nearestNeighbors.length === 0) return;

    const allCandidates: SnapCandidate[] = [];
    const movingBounds = this.getGlobalBounds(movingObject);

    nearestNeighbors.forEach((neighbor) => {
      const neighborBounds = this.getGlobalBounds(neighbor);
      const candidates = this.checkAllAlignments(
        movingBounds,
        neighborBounds,
        neighbor
      );
      allCandidates.push(...candidates);
    });

    if (allCandidates.length === 0) return;

    const xCandidates = allCandidates.filter((c) => c.axis === "x");
    const yCandidates = allCandidates.filter((c) => c.axis === "y");

    let bestXSnap: SnapCandidate | null = null;
    if (xCandidates.length > 0) {
      bestXSnap = xCandidates.reduce((best, current) =>
        current.priority < best.priority ? current : best
      );
    }

    let bestYSnap: SnapCandidate | null = null;
    if (yCandidates.length > 0) {
      bestYSnap = yCandidates.reduce((best, current) =>
        current.priority < best.priority ? current : best
      );
    }

    const parentGroup = movingObject.group;
    const isInsideFrame =
      parentGroup && (parentGroup as any).obj_type === "FRAME";

    if (bestXSnap) {
      if (isInsideFrame) {
        movingObject.set({ left: movingObject.left! + bestXSnap.delta });
      } else {
        movingObject.set({ left: movingObject.left! + bestXSnap.delta });
      }

      this.activeGuides.push({
        type: "vertical",
        position: bestXSnap.position,
        matchType: bestXSnap.matchType,
        priority: bestXSnap.priority,
        bounds: {
          start: bestXSnap.guideStart,
          end: bestXSnap.guideEnd,
        },
        targetObjectId: (bestXSnap.targetObject as any)._id,
        color: "#ff0000",
      });
    }

    if (bestYSnap) {
      if (isInsideFrame) {
        movingObject.set({ top: movingObject.top! + bestYSnap.delta });
      } else {
        movingObject.set({ top: movingObject.top! + bestYSnap.delta });
      }

      this.activeGuides.push({
        type: "horizontal",
        position: bestYSnap.position,
        matchType: bestYSnap.matchType,
        priority: bestYSnap.priority,
        bounds: {
          start: bestYSnap.guideStart,
          end: bestYSnap.guideEnd,
        },
        targetObjectId: (bestYSnap.targetObject as any)._id,
        color: "#ff0000",
      });
    }

    movingObject.setCoords();
  }

  private drawObjectGuides() {
    const ctx = this.canvas.getContext();
    if (!ctx) return;

    const viewport = this.canvas.viewportTransform;
    if (!viewport) return;

    const retina = this.canvas.getRetinaScaling();
    const zoom = this.canvas.getZoom();

    ctx.save();

    ctx.setTransform(
      viewport[0] * retina,
      viewport[1] * retina,
      viewport[2] * retina,
      viewport[3] * retina,
      viewport[4] * retina,
      viewport[5] * retina
    );

    this.activeGuides.forEach((guide) => {
      ctx.save();
      ctx.strokeStyle = guide.color;
      ctx.lineWidth = 0.5 / zoom;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;

      ctx.beginPath();

      if (guide.type === "vertical") {
        ctx.moveTo(guide.position, guide.bounds.start);
        ctx.lineTo(guide.position, guide.bounds.end);
      } else {
        ctx.moveTo(guide.bounds.start, guide.position);
        ctx.lineTo(guide.bounds.end, guide.position);
      }

      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  private clearGuides = () => {
    this.activeGuides = [];
    this.canvas.requestRenderAll();
  };

  // Public API
  public enable() {
    this.config.enabled = true;
  }

  public disable() {
    this.config.enabled = false;
    this.clearGuides();
  }

  public setConfig(config: Partial<ObjectSnapConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setPriority(priority: Partial<ObjectSnapPriority>) {
    this.config.priority = { ...this.config.priority, ...priority };
  }

  public destroy() {
    this.canvas.off("object:moving", this.handleObjectMoving);
    this.canvas.off("after:render", this.handleAfterRender);
    this.canvas.off("object:modified", this.handleObjectModified);
    this.canvas.off("selection:cleared", this.clearGuides);
    this.clearGuides();
  }
}
