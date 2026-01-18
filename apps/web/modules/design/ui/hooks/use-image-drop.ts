import { useEffect } from "react";
import * as fabric from "fabric";
import { Id } from "@workspace/backend/_generated/dataModel";
import { api } from "@workspace/backend/_generated/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

type CreateObjectFunction = (
  args: FunctionArgs<typeof api.design.layers.createObject>,
) => Promise<FunctionReturnType<typeof api.design.layers.createObject>>;

interface UseImageDropOptions {
  canvas: fabric.Canvas | null;
  activePageId: Id<"pages"> | null;
  createObject: CreateObjectFunction;
  onImageAdded?: (imageObj: fabric.Image) => void;
}

export const useImageDrop = ({
  canvas,
  activePageId,
  createObject,
  onImageAdded,
}: UseImageDropOptions) => {
  /**
   * Prevent browser from opening dropped files
   */
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  /**
   * Canvas drop handling
   */
  useEffect(() => {
    if (!canvas || !activePageId) return;

    const el = canvas.upperCanvasEl;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer?.files?.length) return;

      const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );

      if (!imageFiles.length) return;

      // Fabric-correct pointer (accounts for zoom + pan)
      const pointer = canvas.getScenePoint(e);

      for (const file of imageFiles) {
        await handleImageFile(
          file,
          pointer,
          canvas,
          activePageId,
          createObject,
          onImageAdded,
        );
      }
    };

    el?.addEventListener("dragenter", handleDragOver);
    el?.addEventListener("dragover", handleDragOver);
    el?.addEventListener("drop", handleDrop);

    return () => {
      el?.removeEventListener("dragenter", handleDragOver);
      el?.removeEventListener("dragover", handleDragOver);
      el?.removeEventListener("drop", handleDrop);
    };
  }, [canvas, activePageId, createObject, onImageAdded]);
};

async function handleImageFile(
  file: File,
  pointer: { x: number; y: number },
  canvas: fabric.Canvas,
  activePageId: Id<"pages">,
  createObject: CreateObjectFunction,
  onImageAdded?: (imageObj: fabric.Image) => void,
) {
  const dataUrl = await readFileAsDataURL(file);

  const img = await fabric.FabricImage.fromURL(dataUrl, {
    crossOrigin: "anonymous",
  });

  const max = 600;
  if (img.width! > max || img.height! > max) {
    const scale = Math.min(max / img.width!, max / img.height!);
    img.scale(scale);
  }

  img.set({
    left: pointer.x - img.getScaledWidth() / 2,
    top: pointer.y - img.getScaledHeight() / 2,
    obj_type: "IMAGE",
  });

  canvas.add(img as fabric.FabricObject);
  canvas.setActiveObject(img as fabric.FabricObject);
  canvas.requestRenderAll();

  const imageId = await createObject({
    layerObject: {
      pageId: activePageId,
      type: "IMAGE",
      name: file.name,
      left: img.left,
      top: img.top,
      width: img.width,
      height: img.height,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      imageUrl: dataUrl,
    },
  });

  img.set({ _id: imageId });
  onImageAdded?.(img);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// Clipboard Paste Support
// ============================================
export const useImagePaste = ({
  canvas,
  activePageId,
  createObject,
}: {
  canvas: fabric.Canvas | null;
  activePageId: Id<"pages"> | null;
  createObject: CreateObjectFunction;
}) => {
  useEffect(() => {
    if (!canvas) return;

    const handlePaste = async (e: ClipboardEvent) => {
      e.preventDefault();

      const items = e.clipboardData?.items;
      if (!items || !activePageId) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;

          // Get canvas center
          const center = canvas.getCenter();

          await handleImageFile(
            file,
            { x: center.left, y: center.top },
            canvas,
            activePageId,
            createObject,
          );
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canvas, activePageId, createObject]);
};
