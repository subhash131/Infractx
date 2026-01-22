import Konva from "konva";
import { FrameData, ShapeNode } from "./types";
import {
  getGuides,
  getObjectSnappingEdges,
  drawGuides,
} from "./frame-snapping-util";
import { Circle, Rect } from "react-konva";

interface SnappableShapeProps {
  shape: ShapeNode;
  parentFrame: FrameData;
  siblingShapes: ShapeNode[];
  handleShapeUpdate: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleShapeSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  activeTool: string;
}

export const SnappableShape: React.FC<SnappableShapeProps> = ({
  shape,
  parentFrame,
  siblingShapes,
  handleShapeUpdate,
  handleShapeSelect,
  activeTool,
}) => {
  // Helper to remove lines
  const clearGuides = (layer: Konva.Layer) => {
    layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const layer = node.getLayer();
    const stage = node.getStage();

    if (!layer || !stage) return;

    // 1. Cleanup old guides using helper
    clearGuides(layer);

    // 2. Find Snap Stops (Absolute Coordinates)
    const vertical: number[] = [];
    const horizontal: number[] = [];

    // -- Parent Frame Stops --
    const frameNode = layer.findOne(`.frame-rect-${parentFrame.id}`);
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

    // -- Sibling Shapes Stops --
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

    // Draw guides constrained to frame bounds
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
  };

  // NEW: Handle Drag End to clean up lines and save state
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const layer = node.getLayer();

    if (layer) {
      clearGuides(layer); // Remove the red/magenta lines
    }

    // Trigger the update to your state manager (Redux/Zustand/etc)
    handleShapeUpdate(e);
  };

  const commonProps = {
    id: shape._id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    type: shape.type,
    opacity: shape.opacity,
    rotation: shape.rotation,
    stroke: shape.stroke || "black",
    strokeWidth: shape.strokeWidth || 0,
    draggable: activeTool === "SELECT",
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onClick: handleShapeSelect,
    onTransformEnd: handleShapeUpdate,
  };

  switch (shape.type) {
    case "RECT":
      return (
        <Rect {...commonProps} width={shape.width} height={shape.height} />
      );
    case "CIRCLE":
      return <Circle {...commonProps} radius={shape.width / 2} />;
    default:
      return null;
  }
};
