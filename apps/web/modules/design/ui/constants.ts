// fixed document width and height for canvas uniform scaling across different sized devices
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export const TOOLS = {
  RECT: "RECT",
  CIRCLE: "CIRCLE",
  LINE: "LINE",
  PENCIL: "PENCIL",
  TEXT: "TEXT",
} as const;

export type CanvasTool = (typeof TOOLS)[keyof typeof TOOLS];
