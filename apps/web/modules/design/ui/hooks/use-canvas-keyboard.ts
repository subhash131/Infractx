import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { handleGroup, handleUngroup } from "../operations/grouping";
import { Id } from "@workspace/backend/_generated/dataModel";
import { handleCopy, handlePaste } from "../operations/copy-paste";
import { DesignGroup } from "../components/design-tools/group";
import { api } from "@workspace/backend/_generated/api";
import { ReactMutation } from "convex/react";

export const useCanvasKeyboard = (
  canvas: fabric.Canvas | null,
  activePageId: Id<"pages"> | null,
  createObject: ReactMutation<typeof api.design.layers.createObject>,
  updateObject: ReactMutation<typeof api.design.layers.updateObject>,
  removeObject: ReactMutation<typeof api.design.layers.deleteObject>
) => {
  const copiedObjectRef = useRef<fabric.FabricObject | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeObject = canvas.getActiveObject();

      if (
        (activeObject instanceof fabric.IText && activeObject.isEditing) ||
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // COPY
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (!activeObject) return;
        await handleCopy(activeObject, copiedObjectRef);
      }

      // PASTE
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!activePageId) return;
        await handlePaste(copiedObjectRef, canvas, activePageId, createObject);
      }

      // GROUP
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "g"
      ) {
        e.preventDefault();
        if (!(activeObject instanceof fabric.ActiveSelection) || !activePageId)
          return;
        await handleGroup(
          activeObject,
          canvas,
          activePageId,
          createObject,
          updateObject
        );
      }

      // UNGROUP
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "g"
      ) {
        e.preventDefault();
        if (activeObject?.obj_type !== "GROUP") return;
        await handleUngroup(
          activeObject as DesignGroup,
          canvas,
          updateObject,
          removeObject
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas, activePageId, createObject, updateObject, removeObject]);
};
