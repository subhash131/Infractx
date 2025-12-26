import { v } from "convex/values";

export const DESIGN_TOOLS_TYPE = v.union(
  v.literal("RECT"),
  v.literal("FRAME"),
  v.literal("CIRCLE"),
  v.literal("TEXT"),
  v.literal("LINE"),
  v.literal("PENCIL")
);
