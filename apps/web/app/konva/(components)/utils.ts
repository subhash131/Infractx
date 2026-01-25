import { ShapeNode } from "./types";
import { Doc } from "@workspace/backend/_generated/dataModel";
import Konva from "konva";

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
      if (a.order && b.order && a.order !== b.order) {
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

export const calculateOverlap = (
  draggerNode: Konva.Node,
  targetNode: Konva.Node,
): number => {
  const draggerRect = draggerNode.getClientRect();
  const targetRect = targetNode.getClientRect();

  // 1. Calculate Intersection Rectangle
  const x1 = Math.max(draggerRect.x, targetRect.x);
  const y1 = Math.max(draggerRect.y, targetRect.y);
  const x2 = Math.min(
    draggerRect.x + draggerRect.width,
    targetRect.x + targetRect.width,
  );
  const y2 = Math.min(
    draggerRect.y + draggerRect.height,
    targetRect.y + targetRect.height,
  );

  // If no overlap
  if (x2 < x1 || y2 < y1) return 0;

  // 2. Calculate Areas
  const intersectionArea = (x2 - x1) * (y2 - y1);
  const draggerArea = draggerRect.width * draggerRect.height;

  // 3. Return Percentage (0 to 100)
  return (intersectionArea / draggerArea) * 100;
};

export function getTopMostGroup(node: Konva.Node): Konva.Node {
  let current = node;

  // 1. Special Check for SECTION
  // If we selected a Section directly (not a child of it), we check its context.
  // We explicitly check the grandparent to decide if we should stop here.
  const grandParentType = current.getParent()?.getParent()?.attrs.type;

  if (current.attrs.type === "SECTION" && grandParentType !== "GROUP") {
    console.log("Selected Top-Level Section:", current);
    return current;
  }

  // 2. Climbing Loop
  // Handles clicking on children (like a background Rect) or nested Groups
  while (current.parent) {
    const parent = current.parent;
    const parentType = parent.attrs?.type;

    // We climb if the parent is a GROUP or a SECTION
    if (parentType === "GROUP" || parentType === "SECTION") {
      current = parent;
    } else {
      // Stop if we hit Layer, Stage, or other types
      break;
    }
  }

  return current;
}

export function resolveDblClickTarget(
  node: Konva.Node,
  activeShapeId?: string,
): Konva.Node {
  const parent = node.parent;

  // Must be a group
  if (
    parent &&
    parent.attrs?.type === "GROUP" &&
    parent.parent?.attrs?.id === activeShapeId
  ) {
    return parent;
  }

  // Otherwise select the clicked node itself
  return node;
}
