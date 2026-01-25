import { useCallback } from "react";
import Konva from "konva";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ShapeNode } from "../types";
import {
  getGuides,
  getObjectSnappingEdges,
  drawGuides,
} from "../frame-snapping-util";

interface UseShapeDragProps {
  shape: ShapeNode;
  parentFrameId?: Id<"shapes">;
  siblingShapes?: ShapeNode[];
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export const useShapeDrag = ({
  shape,
  parentFrameId,
  siblingShapes = [],
  onDragEnd,
}: UseShapeDragProps) => {
  const clearGuides = useCallback((layer: Konva.Layer) => {
    layer.find(".guid-line").forEach((l) => l.destroy());
  }, []);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      console.log("handleDragMove ::", node.id(), node.parent?.id());

      const layer = node.getLayer();
      const stage = node.getStage();
      if (!layer || !stage) return;

      // 1. Cleanup old guides
      clearGuides(layer);

      // 2. Find Snap Stops (Absolute Coordinates)
      const vertical: number[] = [];
      const horizontal: number[] = [];

      // -- Parent Frame Stops --
      let frameNode: Konva.Node | undefined;
      if (parentFrameId) {
        frameNode = layer.findOne(`.frame-rect-${parentFrameId}`);
        if (frameNode) {
          const frameBox = frameNode.getClientRect({ relativeTo: layer });
          vertical.push(
            frameBox.x,
            frameBox.x + frameBox.width,
            frameBox.x + frameBox.width / 2,
          );
          horizontal.push(
            frameBox.y,
            frameBox.y + frameBox.height,
            frameBox.y + frameBox.height / 2,
          );
        }
      }

      // -- Sibling Shapes Stops --
      // We filter out the current shape from siblings to avoid self-snapping
      siblingShapes.forEach((sibling) => {
        if (sibling._id === shape._id) return;

        const siblingNode = layer.findOne(`#${sibling._id}`);
        if (!siblingNode) return;

        const siblingBox = siblingNode.getClientRect({ relativeTo: layer });
        vertical.push(
          siblingBox.x,
          siblingBox.x + siblingBox.width,
          siblingBox.x + siblingBox.width / 2,
        );
        horizontal.push(
          siblingBox.y,
          siblingBox.y + siblingBox.height,
          siblingBox.y + siblingBox.height / 2,
        );
      });

      // 3. Calculate Guides
      const itemBounds = getObjectSnappingEdges(node);
      if (!itemBounds) return;

      const guides = getGuides(
        { vertical, horizontal },
        itemBounds,
        stage.scaleX(),
      );

      if (!guides.length) return;

      // Draw guides constrained to frame bounds (if frame exists), otherwise infinite
      const frameBounds = frameNode
        ? frameNode.getClientRect({ relativeTo: layer })
        : undefined;

      drawGuides(guides, layer, undefined, frameBounds);

      // 4. Apply Snap using Absolute Positioning
      const currentAbsPos = node.getAbsolutePosition();
      const currentClientRect = node.getClientRect({ relativeTo: layer });

      const anchorOffsetX = currentAbsPos.x - currentClientRect.x;
      const anchorOffsetY = currentAbsPos.y - currentClientRect.y;

      const newPos = {
        x: currentAbsPos.x,
        y: currentAbsPos.y,
      };

      guides.forEach((lg) => {
        if (lg.orientation === "V") {
          newPos.x = lg.lineGuide - lg.offset + anchorOffsetX;
        } else {
          newPos.y = lg.lineGuide - lg.offset + anchorOffsetY;
        }
      });

      node.setAbsolutePosition(newPos);
    },
    [shape._id, parentFrameId, siblingShapes, clearGuides],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const layer = node.getLayer();

      if (layer) {
        clearGuides(layer);
      }

      console.log("DragEnd ::", node.id(), node.parent?.id());
      onDragEnd(e);
    },
    [clearGuides, onDragEnd],
  );

  return {
    handleDragMove,
    handleDragEnd,
  };
};
