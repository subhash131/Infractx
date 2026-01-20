import Konva from "konva";
import { Guide, ShapeNode } from "./types";
import { Doc } from "@workspace/backend/_generated/dataModel";

const VISUAL_THRESHOLD = 5;
const SNAP_DISTANCE_LIMIT = 5;

export const getSnapThreshold = (scale: number): number => {
  return Math.min(VISUAL_THRESHOLD / scale, SNAP_DISTANCE_LIMIT);
};

export const getFrameGuides = (frameWidth: number, frameHeight: number) => ({
  vertical: [0, frameWidth / 2, frameWidth],
  horizontal: [0, frameHeight / 2, frameHeight],
});

export const getChildEdges = (box: any, absX: number, absY: number) => ({
  vertical: [
    { guide: box.x, offset: box.x - absX, snap: "start" },
    {
      guide: box.x + box.width / 2,
      offset: box.x + box.width / 2 - absX,
      snap: "center",
    },
    { guide: box.x + box.width, offset: box.x + box.width - absX, snap: "end" },
  ],
  horizontal: [
    { guide: box.y, offset: box.y - absY, snap: "start" },
    {
      guide: box.y + box.height / 2,
      offset: box.y + box.height / 2 - absY,
      snap: "center",
    },
    {
      guide: box.y + box.height,
      offset: box.y + box.height - absY,
      snap: "end",
    },
  ],
});

export const findSnapGuides = (
  frameGuides: ReturnType<typeof getFrameGuides>,
  childEdges: ReturnType<typeof getChildEdges>,
  threshold: number,
): Guide[] => {
  const resultV: any[] = [];
  const resultH: any[] = [];

  frameGuides.vertical.forEach((lineGuide) => {
    childEdges.vertical.forEach((childEdge) => {
      const diff = Math.abs(lineGuide - childEdge.guide);
      if (diff < threshold) {
        resultV.push({
          lineGuide,
          diff,
          snap: childEdge.snap,
          offset: childEdge.offset,
        });
      }
    });
  });

  frameGuides.horizontal.forEach((lineGuide) => {
    childEdges.horizontal.forEach((childEdge) => {
      const diff = Math.abs(lineGuide - childEdge.guide);
      if (diff < threshold) {
        resultH.push({
          lineGuide,
          diff,
          snap: childEdge.snap,
          offset: childEdge.offset,
        });
      }
    });
  });

  const guides: Guide[] = [];
  const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0];

  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: "V",
      snap: minV.snap,
    });
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: "H",
      snap: minH.snap,
    });
  }

  return guides;
};

export const drawGuides = (
  guides: Guide[],
  group: any,
  frameWidth: number,
  frameHeight: number,
) => {
  guides.forEach((lg) => {
    const points =
      lg.orientation === "H"
        ? [0, lg.lineGuide, frameWidth, lg.lineGuide]
        : [lg.lineGuide, 0, lg.lineGuide, frameHeight];

    const line = new Konva.Line({
      points,
      stroke: "#FF00FF",
      strokeWidth: 1,
      name: "guid-line",
      dash: [4, 6],
    });
    group.add(line);
  });
};

export const createSnapHandler = (
  frameWidth: number,
  frameHeight: number,
  onUpdate: (pos: { x: number; y: number }) => void,
) => {
  return (e: any) => {
    const node = e.target;
    const innerGroup = node.getParent();
    const frameGroup = innerGroup.getParent();

    if (!frameGroup) return;

    frameGroup.find(".guid-line").forEach((l: any) => l.destroy());

    const box = node.getClientRect({ relativeTo: innerGroup });
    const absX = node.x();
    const absY = node.y();

    const frameGuides = getFrameGuides(frameWidth, frameHeight);
    const scale = node.getStage().scaleX();
    const threshold = getSnapThreshold(scale);
    const childEdges = getChildEdges(box, absX, absY);

    const guides = findSnapGuides(frameGuides, childEdges, threshold);

    if (guides.length) {
      drawGuides(guides, frameGroup, frameWidth, frameHeight);

      const pos = { x: absX, y: absY };
      guides.forEach((lg) => {
        if (lg.orientation === "V") pos.x = lg.lineGuide - lg.offset;
        else if (lg.orientation === "H") pos.y = lg.lineGuide - lg.offset;
      });

      node.setAttrs(pos);
      onUpdate(pos); // Notify parent of position change
    }
  };
};

export const clearGuides = (e: any) => {
  const innerGroup = e.target.getParent();
  const frameGroup = innerGroup?.getParent();
  if (frameGroup) {
    frameGroup.find(".guid-line").forEach((l: any) => l.destroy());
  }
};

export const getOverlapRatio = (shapeBox: any, frameBox: any) => {
  // Calculate intersection rectangle
  const x1 = Math.max(shapeBox.x, frameBox.x);
  const x2 = Math.min(shapeBox.x + shapeBox.width, frameBox.x + frameBox.width);
  const y1 = Math.max(shapeBox.y, frameBox.y);
  const y2 = Math.min(
    shapeBox.y + shapeBox.height,
    frameBox.y + frameBox.height,
  );

  // If no overlap
  if (x2 < x1 || y2 < y1) return 0;

  const overlapArea = (x2 - x1) * (y2 - y1);
  const shapeArea = shapeBox.width * shapeBox.height;

  return overlapArea / shapeArea;
};

// It turns your flat list into a tree in milliseconds.
export const buildTreeOptimized = (flatShapes: any[]) => {
  const idMapping = new Map();
  const tree: any = [];

  // 1. Create a map of all items (Instant lookup)
  flatShapes.forEach((shape) => {
    idMapping.set(shape.id, { ...shape, children: [] });
  });

  // 2. Link them up
  flatShapes.forEach((shape) => {
    // Get the object reference from the map
    const node = idMapping.get(shape.id);

    if (shape.parentId) {
      // If it has a parent, add it to the parent's children array
      const parent = idMapping.get(shape.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      // If no parent, it's a root item
      tree.push(node);
    }
  });

  return tree;
};

// 2. Define the Tree Node (inherits Shape + adds children)

/**
 * Parses a flat list of shapes into a hierarchical tree.
 * Sorts siblings by 'order', falling back to '_creationTime'.
 */
export function buildShapeTree(shapes: Doc<"shapes">[]): ShapeNode[] {
  const nodeMap = new Map<string, ShapeNode>();
  const roots: ShapeNode[] = [];

  // Step A: Initialize Map and Clone Objects
  // We clone to avoid mutating the original input array
  shapes.forEach((shape) => {
    nodeMap.set(shape._id, { ...shape, children: [] });
  });

  // Step B: Build Hierarchy
  nodeMap.forEach((node) => {
    // If it has a parent AND that parent exists in our list
    if (node.parentShapeId && nodeMap.has(node.parentShapeId)) {
      const parent = nodeMap.get(node.parentShapeId)!;
      parent.children.push(node);
    } else {
      // Otherwise, it's a root item
      roots.push(node);
    }
  });

  // Step C: Recursive Sort Function
  const sortNodes = (nodes: ShapeNode[]) => {
    nodes.sort((a, b) => {
      // Primary Sort: Explicit Order
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      // Secondary Sort: Creation Time (Oldest first = drawn first)
      return a._creationTime - b._creationTime;
    });

    // Recursively sort children
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);

  return roots;
}
