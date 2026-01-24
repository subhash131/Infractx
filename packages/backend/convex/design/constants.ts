import { v } from "convex/values";

export const DESIGN_TOOLS_TYPE = v.union(
  v.literal("RECT"),
  v.literal("FRAME"),
  v.literal("CIRCLE"),
  v.literal("TEXT"),
  v.literal("LINE"),
  v.literal("GROUP"),
  v.literal("PENCIL"),
  v.literal("IMAGE"),
  v.literal("SECTION"),
);

export const SELECT_COLOR = "#4096ee";

export const MESSAGE_CONTEXT_TYPE = v.optional(
  v.array(
    v.object({
      type: v.union(v.literal("DOC_REF"), v.literal("TEXT")),
      id: v.string(),
      tableName: v.union(v.literal("LAYERS"), v.literal("TEMPLATES")),
    }),
  ),
);

export const LAYER_OBJECT_ARGS = v.object({
  pageId: v.id("pages"),
  // Object properties
  type: DESIGN_TOOLS_TYPE,
  name: v.optional(v.string()),
  layerRef: v.optional(v.string()),

  // Position and dimensions
  padding: v.optional(v.number()),
  left: v.optional(v.float64()),
  top: v.float64(),
  width: v.float64(),
  height: v.float64(),
  points: v.optional(
    v.array(
      v.object({
        x: v.number(),
        y: v.number(),
      }),
    ),
  ),

  // Rotation and scaling
  angle: v.optional(v.float64()),
  scaleX: v.optional(v.float64()),
  scaleY: v.optional(v.float64()),

  // Styling
  fill: v.optional(v.string()),
  stroke: v.optional(v.string()),
  strokeWidth: v.optional(v.float64()),
  opacity: v.optional(v.float64()),

  // Text-specific properties
  text: v.optional(v.string()),
  fontSize: v.optional(v.float64()),
  fontFamily: v.optional(v.string()),
  fontWeight: v.optional(v.string()),
  textAlign: v.optional(v.string()),
  fontStyle: v.optional(v.string()),
  underline: v.optional(v.boolean()),
  linethrough: v.optional(v.boolean()),
  overline: v.optional(v.boolean()),

  // Image-specific properties
  imageUrl: v.optional(v.string()),

  // Shape-specific properties
  radius: v.optional(v.float64()),
  rx: v.optional(v.float64()),
  ry: v.optional(v.float64()),

  // Advanced properties
  shadow: v.optional(v.string()),
  data: v.optional(v.any()),
  strokeUniform: v.optional(v.boolean()),
  parentLayerId: v.optional(v.id("layers")),
  borderScaleFactor: v.optional(v.float64()),
  frameTop: v.optional(v.float64()),
});
