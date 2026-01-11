import * as fabric from "fabric";
import { SnapGuide } from "./types";

export class SnapRenderer {
  private canvas: fabric.Canvas;

  private readonly COLORS = {
    center: "#ff0000",
    edge: "#ff0000", // Different color for edges
  };

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  drawGuides(guides: SnapGuide[], frame: fabric.FabricObject) {
    const ctx = this.canvas.getContext();
    if (!ctx) return;

    const viewport = this.canvas.viewportTransform;
    if (!viewport) return;

    const frameBounds = frame.getBoundingRect();
    const frameCenter = frame.getCenterPoint();

    // 1. Get the device pixel ratio (Retina factor)
    const retina = this.canvas.getRetinaScaling();
    const zoom = this.canvas.getZoom();

    ctx.save();

    // 2. Apply retina scaling to the viewport transform
    ctx.setTransform(
      viewport[0] * retina,
      viewport[1] * retina,
      viewport[2] * retina,
      viewport[3] * retina,
      viewport[4] * retina,
      viewport[5] * retina
    );

    guides.forEach((guide) => {
      ctx.save();
      ctx.strokeStyle = guide.color;
      ctx.lineWidth = 0.5 / zoom;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;

      ctx.beginPath();

      if (guide.type === "vertical") {
        const x = frameCenter.x + guide.position;
        const y1 = frameBounds.top;
        const y2 = frameBounds.top + frameBounds.height;
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
      } else {
        const y = frameCenter.y + guide.position;
        const x1 = frameBounds.left;
        const x2 = frameBounds.left + frameBounds.width;
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
      }

      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  getGuideColor(matchType: "edge" | "center"): string {
    return this.COLORS[matchType];
  }
}
