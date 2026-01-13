import { Doc, Id } from "../_generated/dataModel";

export function getNextFramePosition(frames: Doc<"layers">[]) {
  if (!frames || frames.length === 0) {
    return { left: 0 }; // Default position if no frames exist
  }

  // Find the rightmost edge (left + width) of all frames
  const rightmostEdge = Math.max(
    ...frames.map((frame) => frame.left + frame.width)
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
  frameId: Id<"layers">
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
  frameId: Id<"layers">
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
