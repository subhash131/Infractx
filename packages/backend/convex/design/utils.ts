import { Doc } from "../_generated/dataModel";

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
