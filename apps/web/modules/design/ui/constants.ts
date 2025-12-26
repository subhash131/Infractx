import { Doc } from "@workspace/backend/_generated/dataModel";

// fixed document width and height for canvas uniform scaling across different sized devices
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export type LayerTypes = Doc<"layers">["type"];

export const TOOLS: Record<string, LayerTypes> = {
  RECT: "RECT",
  FRAME: "FRAME",
  CIRCLE: "CIRCLE",
  LINE: "LINE",
  PENCIL: "PENCIL",
  TEXT: "TEXT",
} as const;
