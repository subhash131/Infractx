import { v } from "convex/values";

export const DESIGN_TOOLS_TYPE = v.union(
  v.literal("RECT"),
  v.literal("FRAME"),
  v.literal("CIRCLE"),
  v.literal("TEXT"),
  v.literal("LINE"),
  v.literal("PENCIL")
);

export const MESSAGE_CONTEXT_TYPE = v.optional(
  v.array(
    v.object({
      type: v.union(v.literal("DOC_REF"), v.literal("TEXT")),
      id: v.string(),
      tableName: v.union(v.literal("LAYERS"), v.literal("TEMPLATES")),
    })
  )
);
