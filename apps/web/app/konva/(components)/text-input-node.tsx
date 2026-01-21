import React, { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";
import Konva from "konva";
import { ShapeNode } from "./types";

interface TextInputNodeProps {
  shape: ShapeNode;
  isSelected: boolean;
  draggable: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleShapeUpdate: (e: Konva.KonvaEventObject<DragEvent | Event>) => void;
  onTextChange?: (shapeId: string, newText: string) => void; // New prop for text updates
}

export const TextInputNode: React.FC<TextInputNodeProps> = ({
  shape,
  isSelected,
  draggable,
  onSelect,
  handleShapeUpdate,
  onTextChange,
}) => {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  const handleDblClick = () => {
    const textNode = textRef.current;
    if (!textNode) return;

    const stage = textNode.getStage();
    if (!stage) return;

    const textPosition = textNode.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    // Create textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = shape.text || "";
    textarea.style.position = "absolute";
    textarea.style.top = areaPosition.y + "px";
    textarea.style.left = areaPosition.x + "px";
    textarea.style.width = (shape.width || 200) + "px";
    textarea.style.fontSize = (shape.fontSize || 20) + "px";
    textarea.style.fontFamily = shape.fontFamily || "Arial";
    textarea.style.border = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = (shape.fontSize || 20) + "px";
    textarea.style.transformOrigin = "left top";
    textarea.style.color = shape.fill || "#000";
    textarea.style.zIndex = "1000";

    // Handle rotation
    const rotation = textNode.rotation();
    let transform = "";
    if (rotation) {
      transform += "rotateZ(" + rotation + "deg)";
    }

    // Firefox specific offset
    let px = 0;
    const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
    if (isFirefox) {
      px += 2 + Math.round((shape.fontSize || 20) / 20);
    }
    transform += "translateY(-" + px + "px)";
    textarea.style.transform = transform;

    // Auto height
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + 3 + "px";

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const removeTextarea = () => {
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener("click", handleOutsideClick);
      textNode.show();
      trRef.current?.show();
      trRef.current?.forceUpdate();
      textNode.getLayer()?.batchDraw();
    };

    const saveText = () => {
      const newText = textarea.value;

      // Optimistic update - update the text node immediately
      textNode.text(newText);
      textNode.getLayer()?.batchDraw();

      // Call the text change handler (separate from shape transform updates)
      onTextChange?.(shape._id, newText);
      removeTextarea();
    };

    const cancelEdit = () => {
      // Don't save, just close
      removeTextarea();
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target !== textarea) {
        saveText(); // Save when clicking outside
      }
    };

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit(); // Escape = cancel without saving
      }
      // Enter just adds a new line (default behavior)
    });

    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height =
        textarea.scrollHeight + (shape.fontSize || 20) + "px";
    });

    // Save when textarea loses focus (blur)
    textarea.addEventListener("blur", () => {
      saveText();
    });

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    });

    // Hide Konva text while editing
    textNode.hide();
    trRef.current?.hide();
    textNode.getLayer()?.batchDraw();
  };

  return (
    <>
      <Text
        ref={textRef}
        id={shape._id}
        x={shape.x}
        y={shape.y}
        text={shape.text || "Double click to edit"}
        fontSize={shape.fontSize || 20}
        fontFamily={shape.fontFamily || "Arial"}
        fill={shape.fill}
        opacity={shape.opacity}
        rotation={shape.rotation}
        width={shape.width || 200}
        draggable={draggable}
        listening={true}
        perfectDrawEnabled={false}
        onClick={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={handleShapeUpdate}
        onTransformEnd={(e) => {
          const node = textRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          // Update dimensions
          node.width(Math.max(5, node.width() * scaleX));
          node.fontSize(Math.max(5, node.fontSize() * scaleY));

          handleShapeUpdate(e);
        }}
        type={shape.type}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
          ]}
        />
      )}
    </>
  );
};
