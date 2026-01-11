import * as fabric from "fabric";
import { SnapGuide } from "./types";

export class SnapRenderer {
  private canvas: fabric.Canvas;

  private readonly COLORS = {
    center: "#ff0000",
    edge: "#ff0000",
  };

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  drawGuides(guides: SnapGuide[], frame: fabric.FabricObject) {
    const ctx = this.canvas.getContext();
    if (!ctx) return;

    console.log({ guides });

    const frameMatrix = frame.calcTransformMatrix();
    const viewport = this.canvas.viewportTransform;

    if (!viewport) return;

    ctx.save();

    ctx.setTransform(   
      viewport[0],
      viewport[1],
      viewport[2],
      viewport[3],
      viewport[4],
      viewport[5]
    );

    guides.forEach((guide) => {
      ctx.save();
      ctx.strokeStyle = guide.color;
      const zoom = this.canvas.getZoom();
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.9;

      ctx.beginPath();

      if (guide.type === "vertical") {
        const p1 = fabric.util.transformPoint(
          new fabric.Point(guide.position, guide.bounds.start),
          frameMatrix
        );
        const p2 = fabric.util.transformPoint(
          new fabric.Point(guide.position, guide.bounds.end),
          frameMatrix
        );

        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else {
        const p1 = fabric.util.transformPoint(
          new fabric.Point(guide.bounds.start, guide.position),
          frameMatrix
        );
        const p2 = fabric.util.transformPoint(
          new fabric.Point(guide.bounds.end, guide.position),
          frameMatrix
        );

        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
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
