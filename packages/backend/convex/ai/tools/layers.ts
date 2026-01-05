"use node";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { groqModel } from "../designAgent";
import { Doc } from "../../_generated/dataModel";

// ============================================
// TOOL 1: Add Rectangle
// ============================================
export const addRectangleTool = tool(
  async ({
    name,
    width,
    height,
    left,
    top,
    fill,
    strokeWidth,
    stroke,
    angle,
    rx,
    ry,
  }) => {

    const rectObject = {
      name,
      width: Number(width),
      height: Number(height),
      left: Number(left),
      top: Number(top),
      fill,
      stroke,
      strokeWidth: Number(strokeWidth),
      angle: Number(angle),
      rx: rx ? Number(rx) : 0,
      ry: ry ? Number(ry) : 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      type: "RECT" as Doc<"layers">["type"],
    };

    return rectObject;
  },
  {
    name: "addRectangle",
    description: `Add a rectangle shape to the current frame. Intelligently extract dimensions, position, and styling from user requests.
    
    Use cases:
    - "Add a blue rectangle" → creates default-sized blue rectangle centered
    - "Add a 400x300 red box at top left" → creates positioned colored rectangle
    
    Smart extraction rules:
    - Dimensions: Parse explicit sizes (e.g., "800x600") or relative terms ("wide" = 1200+ width, "tall" = 1400+ height, "small" = 400x300)
    - Colors: Convert color names to hex codes (e.g., "blue" → "#3b82f6", "red" → "#ef4444")
    - Position: left and top can be negative for positioning. Center = -width/2 or -height/2
    - Defaults: 200x100 dimensions, white fill (#f3f3f3), centered position`,

    schema: z.object({
      name: z.string().describe("Descriptive name for the rectangle"),
      type: z.enum(["RECT"]).default("RECT"),
      width: z
        .union([z.string(), z.number()])
        .default(200)
        .describe("Width in pixels. Default 200"),
      height: z
        .union([z.string(), z.number()])
        .default(100)
        .describe("Height in pixels. Default 100"),
      left: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Horizontal position. Can be negative"),
      top: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Vertical position. Can be negative"),
      strokeWidth: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Border width. Default 0"),
      angle: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Rotation angle. Range: -360 to 360"),
      rx: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Horizontal corner radius"),
      ry: z
        .union([z.string(), z.number()])
        .default(0)
        .describe("Vertical corner radius"),

      fill: z
        .string()
        .default("#f3f3f3")
        .describe(
          "Fill color as hex code (e.g., '#3b82f6' for blue, '#ef4444' for red)"
        ),
      stroke: z
        .string()
        .default("#000000")
        .describe("Stroke color as hex code. Only if user mentions border"),
    }),
    returnDirect:true
  }
);

// ============================================
// TOOL 2: Add Circle
// ============================================
export const addCircleTool = tool(
  async ({ name, radius, left, top, fill, stroke, strokeWidth, angle,height,width }) => {
    const circleObject = {
      type: "CIRCLE" as Doc<"layers">["type"],
      name,
      radius,
      left,
      top,
      fill,
      stroke,
      strokeWidth,
      angle,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      height,
      width,
    };

    return circleObject
  },
  {
    name: "addCircle",
    description: `Add a circle shape to the current frame. Extract size, position, and styling from user requests.
    
    Use cases:
    - "Add a blue circle" → creates default blue circle centered
    - "Add a small red dot" → creates small red circle
    - "Create a large circle at the top" → creates large circle at top center
    
    Smart extraction rules:
    - Size: Parse explicit radius or relative terms ("small" = 50, "medium"/"default" = 100, "large" = 200, "dot" = 25)
    - Colors: Convert color names to hex codes same as rectangle
    - Position: Same formulas as rectangle but use radius instead of width/height. Center = -radius for both left and top
    - Defaults: radius 100, white fill, centered, no stroke`,

    schema: z.object({
      type: z.enum(["CIRCLE"]).default("CIRCLE"),
      width: z
        .union([z.string(), z.number()])
        .default(200)
        .describe("Width in pixels. Default 100"),
      height: z
        .union([z.string(), z.number()])
        .default(200)
        .describe("Height in pixels. Default 100"),
      radius: z.coerce
        .number()
        .default(100)
        .describe(
          "Circle radius in pixels. Default 100. Adjust based on user intent: 'small' = 25-50, 'medium' = 100, 'large' = 200+"
        ),
      name: z
        .string()
        .describe(
          "Descriptive name for the circle (e.g., 'Blue Circle', 'Avatar Placeholder')"
        ),
      left: z.coerce
        .number()
        .default(0)
        .describe(
          "Horizontal position in pixels from center of frame. Default 0 (centered). Use formula: center = -radius. Same positioning logic as rectangle"
        ),
      top: z.coerce
        .number()
        .default(0)
        .describe(
          "Vertical position in pixels from center of frame. Default 0 (centered). Use formula: center = -radius. Same positioning logic as rectangle"
        ),
      fill: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default("#f3f3f3")
        .describe(
          "Fill color as 6-digit hex code. Same color conversion rules as rectangle"
        ),
      stroke: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .describe(
          "Stroke/border color as 6-digit hex code. Only set if user mentions border"
        ),
      strokeWidth: z.coerce
        .number()
        .min(0)
        .default(0)
        .describe("Border/stroke width in pixels. Default 0 (no border)"),
      angle: z.coerce
        .number()
        .min(-360)
        .max(360)
        .default(0)
        .describe("Rotation angle in degrees (rarely needed for circles)"),
    }),
  }
);

// ============================================
// TOOL 3: Add Text
// ============================================
export const addTextTool = tool(
  async ({
    name,
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textAlign,
    fontStyle,
    underline,
    linethrough,
    left,
    top,
    fill,
    angle,height,width
  }) => {
    const textObject = {
      type: "TEXT" as Doc<"layers">["type"],
      name,
      height,
      width,
      text,
      fontSize,
      fontFamily,
      fontWeight,
      textAlign,
      fontStyle,
      underline,
      linethrough,
      left,
      top,
      fill,
      angle,
    };

    return textObject;
  },
  {
    name: "addText",
    description: `Add a text element to the current frame. Extract text content, styling, and position from user requests.
    
    Use cases:
    - "Add text 'Hello World'" → creates default styled text centered
    - "Add a large heading 'Welcome'" → creates large, bold text
    - "Add small gray text at the bottom" → creates small text positioned at bottom
    - "Add centered blue title" → creates centered, blue colored text
    
    Smart extraction rules:
    - Text content: Extract exact text from quotes or after keywords like "saying", "with text", "labeled"
    - Font size: Parse from size terms ("small" = 16, "normal" = 24, "large" = 36, "heading" = 48, "title" = 64)
    - Font weight: "bold" = "bold", "light" = "300", "normal" = "normal", "heavy" = "900"
    - Alignment: "left" = "left", "center"/"centered" = "center", "right" = "right". Default "left"
    - Style: "italic" = "italic", "underline" = underline:true, "strikethrough" = linethrough:true
    - Colors: Same hex conversion as rectangle
    - Position: Same formulas as rectangle
    - Defaults: fontSize 24, Arial font, normal weight, left align, black text (#000000), centered position`,

    schema: z.object({
      type: z.enum(["TEXT"]).default("TEXT"),
      height: z.coerce.number().default(50),
      width: z.coerce.number().default(50),
      name: z
        .string()
        .describe(
          "Descriptive name for the text layer (e.g., 'Heading', 'Body Text', 'Caption')"
        ),
      text: z
        .string()
        .describe(
          "The actual text content to display. Extract from quotes or context"
        ),
      fontSize: z.coerce
        .number()
        .default(24)
        .describe(
          "Font size in pixels. Default 24. Adjust based on user intent: 'small' = 16, 'normal' = 24, 'large' = 36, 'heading' = 48, 'title' = 64"
        ),
      fontFamily: z
        .string()
        .default("Arial")
        .describe(
          "Font family name. Default 'Arial'. Common options: 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Roboto', 'Open Sans'"
        ),
      fontWeight: z
        .string()
        .default("normal")
        .describe(
          "Font weight. Default 'normal'. Options: '300'/'light', 'normal', 'bold', '900'/'heavy'. Use 'bold' for headings"
        ),
      textAlign: z
        .enum(["left", "center", "right"])
        .default("left")
        .describe(
          "Text alignment. Default 'left'. Use 'center' for titles/headings, 'left' for body text, 'right' when specified"
        ),
      fontStyle: z
        .enum(["normal", "italic"])
        .default("normal")
        .describe(
          "Font style. Default 'normal'. Set to 'italic' if user mentions italic/italicized"
        ),
      underline: z
        .boolean()
        .default(false)
        .describe(
          "Whether text is underlined. Set true only if user explicitly mentions underline"
        ),
      linethrough: z
        .boolean()
        .default(false)
        .describe(
          "Whether text has strikethrough. Set true only if user mentions strikethrough/crossed out"
        ),
      left: z.coerce
        .number()
        .default(0)
        .describe(
          "Horizontal position in pixels from center of frame. Default 0 (centered). Same positioning logic as rectangle"
        ),
      top: z.coerce
        .number()
        .default(0)
        .describe(
          "Vertical position in pixels from center of frame. Default 0 (centered). Same positioning logic as rectangle"
        ),
      fill: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default("#000000")
        .describe(
          "Text color as 6-digit hex code. Default '#000000' (black). Same color conversion rules as rectangle"
        ),
      angle: z.coerce
        .number()
        .min(-360)
        .max(360)
        .default(0)
        .describe("Rotation angle in degrees. Default 0 (no rotation)"),
    }),
  }
);

// ============================================
// Bind all tools to your model
// ============================================
export const allShapeTools = [
  addRectangleTool,
  addCircleTool,
  addTextTool,
];

// Usage with your model:
export const groqWithShapeTools = groqModel.bindTools(allShapeTools);
