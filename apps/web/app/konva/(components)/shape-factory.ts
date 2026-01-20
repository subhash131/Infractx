import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { FunctionArgs } from "convex/server";
import { api } from "@workspace/backend/_generated/api";
import type { NewShape } from "./hooks/use-shape-drawing";

type CreateShapeArgs = FunctionArgs<typeof api.design.shapes.createShape>;

export const createShapeObject = (
  toolType: string,
  shape: NewShape,
): CreateShapeArgs["shapeObject"] | null => {
  const baseShape = {
    x: shape.width < 0 ? shape.x + shape.width : shape.x,
    y: shape.height < 0 ? shape.y + shape.height : shape.y,
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
    fill: "#008080",
    opacity: 1,
    strokeWidth: 0,
    order: 0,
    rotation: 0,
    pageId: "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">,
  };

  switch (toolType) {
    case "RECT":
      return {
        ...baseShape,
        type: "RECT" as Doc<"shapes">["type"],
        name: "Rectangle",
      };
    case "CIRCLE":
      return {
        ...baseShape,
        type: "CIRCLE" as Doc<"shapes">["type"],
        name: "Circle",
      };
    default:
      return null;
  }
};
