import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { DESIGN_TOOLS_TYPE } from "./constants";
import { MutationCtx } from "../_generated/server";

export const shapeInsertValidator = v.object({
  // --- Identity & Hierarchy ---
  type: DESIGN_TOOLS_TYPE,
  pageId: v.id("pages"),
  name: v.string(),

  // hierarchy
  parentShapeId: v.optional(v.union(v.id("shapes"), v.null())), // Null = Root Layer

  // --- Geometry ---
  x: v.float64(),
  y: v.float64(),
  width: v.float64(),
  height: v.float64(),
  rotation: v.float64(),
  scaleX: v.optional(v.float64()),
  scaleY: v.optional(v.float64()),

  // --- Frame Logic ---
  clipsContent: v.optional(v.boolean()),

  // --- Styling ---
  fill: v.string(),
  stroke: v.optional(v.string()),
  strokeWidth: v.float64(),
  opacity: v.optional(v.float64()),
  cornerRadius: v.optional(v.float64()),

  // --- Specific Data ---
  text: v.optional(v.string()),
  fontSize: v.optional(v.float64()),
  fontFamily: v.optional(v.string()),
  fontWeight: v.optional(v.string()),
  textAlign: v.optional(v.string()),
  fontStyle: v.optional(v.string()),
  underline: v.optional(v.boolean()),
  linethrough: v.optional(v.boolean()),
  lineHeight: v.optional(v.float64()),
  overline: v.optional(v.boolean()),

  imageUrl: v.optional(v.string()), // For Type: IMAGE

  // For Type: PATH / LINE / POLYGON
  points: v.optional(v.any()), // Array of points
  pathData: v.optional(v.string()), // SVG Path string for complex shapes
  radius: v.optional(v.float64()), // For CIRCLE

  // --- Metadata ---
  order: v.optional(v.float64()),
  locked: v.optional(v.boolean()),
  visible: v.optional(v.boolean()),

  // arbitrary data for plugins or fabric.js specifics
  meta: v.optional(v.any()),

  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

export function getNextFramePosition(frames: Doc<"layers">[]) {
  if (!frames || frames.length === 0) {
    return { left: 0 }; // Default position if no frames exist
  }

  // Find the rightmost edge (left + width) of all frames
  const rightmostEdge = Math.max(
    ...frames.map((frame) => frame.left + frame.width),
  );

  // Add 10px padding for the new object's left position
  const newLeft = rightmostEdge + 10;

  return { left: newLeft };
}

export type LayerNode = Doc<"layers"> & {
  children: LayerNode[];
};

export type TemplateLayerNode = Omit<
  Doc<"layers">,
  "_id" | "_creationTime" | "pageId" | "parentLayerId"
> & {
  children: TemplateLayerNode[];
};

export function buildPageLayerTree(layers: Doc<"layers">[]): LayerNode[] {
  function build(parentId: Id<"layers"> | null | undefined): LayerNode[] {
    return layers
      .filter((layer) => {
        if (parentId == null) {
          return layer.parentLayerId == null;
        }
        return layer.parentLayerId === parentId;
      })
      .map((layer) => ({
        ...layer,
        children: build(layer._id),
      }));
  }

  return build(null);
}

export function buildFrameLayerTree(
  layers: Doc<"layers">[],
  frameId: Id<"layers">,
): LayerNode[] {
  function build(layers: Doc<"layers">[], parentId: Id<"layers">): LayerNode[] {
    return layers
      .filter((layer) => layer.parentLayerId === parentId)
      .map((layer) => ({
        ...layer,
        children: build(layers, layer._id),
      }));
  }
  return build(layers, frameId);
}

export function buildFrameTemplateTree(
  layers: Doc<"layers">[],
  frameId: Id<"layers">,
): TemplateLayerNode[] {
  function build(parentId: Id<"layers">): TemplateLayerNode[] {
    return layers
      .filter((l) => l.parentLayerId === parentId)
      .map(({ _id, _creationTime, pageId, parentLayerId, ...rest }) => ({
        ...rest,
        children: build(_id),
      }));
  }

  return build(frameId);
}

// 1. Define a recursive helper function
export async function deleteShapeRecursive(
  ctx: MutationCtx,
  shapeId: Id<"shapes">,
) {
  // Find all immediate children of this shape
  const children = await ctx.db
    .query("shapes")
    .withIndex("by_parent", (q) => q.eq("parentShapeId", shapeId))
    .collect();

  // Recursively call this function for every child found
  // We use a for...of loop to ensure we await each deletion properly
  for (const child of children) {
    await deleteShapeRecursive(ctx, child._id);
  }

  // Finally, delete the current shape itself
  await ctx.db.delete(shapeId);
}
