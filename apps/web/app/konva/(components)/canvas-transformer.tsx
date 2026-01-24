import Konva from "konva";
import React, { Ref } from "react";
import { Transformer } from "react-konva";

export const CanvasTransformer = ({
  transformerRef,
}: {
  transformerRef: Ref<Konva.Transformer>;
}) => {
  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      }}
      rotateEnabled={false}
      rotateLineVisible={false}
      borderStroke="#2196f3"
      borderStrokeWidth={1}
      anchorStroke="#2196f3"
      anchorFill="white"
      anchorSize={8}
      anchorCornerRadius={2}
      draggable={false}
      anchorStyleFunc={(anchor) => {
        // 1. Get the node this transformer is attached to
        // anchor.getParent() is the Transformer itself
        const transformer = anchor.getParent();
        if (!transformer) return;
        const node = (transformer as any).nodes()[0];
        if (!node) return;

        // 2. Check if the attached node is a Circle
        if (node.getClassName() === "Circle") {
          if (
            anchor.hasName("middle-left") ||
            anchor.hasName("middle-right") ||
            anchor.hasName("top-center") ||
            anchor.hasName("bottom-center") ||
            anchor.hasName("rotater")
          ) {
            anchor.width(0);
            anchor.height(0);
          }
        }
      }}
    />
  );
};
