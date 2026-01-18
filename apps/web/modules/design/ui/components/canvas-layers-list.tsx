import React, { useCallback, useEffect, useState } from "react";
import * as fabric from "fabric";
import useCanvas from "../../store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/utils";
import { RecursiveLayer } from "./snapping/utils/types";

/* ======================================================
   Helpers: Fabric object lookup (recursive)
====================================================== */

const findFabricObjectById = (
  obj: fabric.FabricObject,
  id: string,
): fabric.FabricObject | null => {
  if (obj._id === id) return obj;

  const children = (obj as fabric.Group)._objects;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFabricObjectById(child, id);
      if (found) return found;
    }
  }
  return null;
};

const findOnCanvas = (
  canvas: fabric.Canvas,
  id: string,
): fabric.FabricObject | null => {
  for (const obj of canvas.getObjects()) {
    const found = findFabricObjectById(obj, id);
    if (found) return found;
  }
  return null;
};

/* ======================================================
   Layer Row (pure render)
====================================================== */

const LayerRow = React.memo(
  ({
    layer,
    depth,
    isEditing,
    collapsed,
  }: {
    layer: RecursiveLayer[number];
    depth: number;
    isEditing: boolean;
    collapsed: boolean;
  }) => {
    const hasChildren = layer.children?.length > 0;

    return (
      <div
        className="flex items-center"
        style={{ paddingLeft: 8 + depth * 12 }}
        data-layer-id={layer._id}
      >
        {hasChildren && (
          <span
            className="text-xs select-none cursor-pointer"
            data-collapse-toggle
          >
            {collapsed ? (
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            ) : (
              <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
            )}
          </span>
        )}

        {isEditing ? (
          <Input
            autoFocus
            defaultValue={layer.name}
            className="w-full px-1 py-0.5 text-sm border rounded"
            data-layer-id={layer._id}
            data-editing="true"
          />
        ) : (
          <Button
            data-layer-id={layer._id}
            variant={"ghost"}
            className={cn(hasChildren && "pl-0")}
          >
            {layer.name}
          </Button>
        )}
      </div>
    );
  },
);

LayerRow.displayName = "LayerRow";

/* ======================================================
   Component
====================================================== */

export const CanvasLayersList = () => {
  const { activeDesignId, setActivePageId, canvas } = useCanvas();
  console.log({ activeDesignId });

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const isCollapsed = (id: string) => collapsed.has(id);

  const pages = useQuery(
    api.design.pages.getFilePages,
    activeDesignId ? { designId: activeDesignId as Id<"designs"> } : "skip",
  );

  const file = useQuery(
    api.design.files.getDesignFileById,
    activeDesignId ? { designId: activeDesignId as Id<"designs"> } : "skip",
  );

  const layers = useQuery(
    api.design.layers.getLayersByPage,
    file?.activePage ? { pageId: file.activePage as Id<"pages"> } : "skip",
  );

  const addPage = useMutation(api.design.pages.createPage);
  const setActiveLayer = useMutation(api.design.files.setActivePage);
  const renameLayer = useMutation(api.design.layers.renameLayer);

  useEffect(() => {
    if (!file) return;
    setActivePageId(file.activePage ?? null);
  }, [file, setActivePageId]);

  /* ======================================================
     Recursive renderer (no handlers)
  ====================================================== */

  const renderLayerTree = (
    layer: RecursiveLayer[number],
    depth = 0,
  ): React.ReactNode => {
    const collapsedHere = collapsed.has(layer._id);

    return (
      <React.Fragment key={layer._id}>
        <LayerRow
          layer={layer}
          depth={depth}
          isEditing={editingLayerId === layer._id}
          collapsed={collapsedHere}
        />

        {!collapsedHere &&
          layer.children?.map((child: RecursiveLayer[number]) =>
            renderLayerTree(child, depth + 1),
          )}
      </React.Fragment>
    );
  };

  /* ======================================================
     Delegated Event Handlers
  ====================================================== */

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      const toggle = target.closest("[data-collapse-toggle]");
      if (toggle) {
        const layerId = toggle
          .closest("[data-layer-id]")
          ?.getAttribute("data-layer-id");

        if (!layerId) return;

        setCollapsed((prev) => {
          const next = new Set(prev);
          next.has(layerId) ? next.delete(layerId) : next.add(layerId);
          return next;
        });

        return; // prevent canvas selection
      }

      const layerId = target
        .closest("[data-layer-id]")
        ?.getAttribute("data-layer-id");

      if (!layerId || !canvas) return;

      const obj = findOnCanvas(canvas, layerId);
      if (!obj) return;

      obj.setCoords();
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const layerId = target
        .closest("[data-layer-id]")
        ?.getAttribute("data-layer-id");

      if (!layerId) return;

      setEditingLayerId(layerId);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLInputElement;
      if (!target.dataset.editing) return;

      if (e.key === "Enter") {
        target.blur();
      }

      if (e.key === "Escape") {
        setEditingLayerId(null);
        target.value = "";
      }
    },
    [],
  );

  const handleBlur = useCallback(
    async (e: React.FocusEvent<HTMLDivElement>) => {
      const target = e.target as HTMLInputElement;
      if (!target.dataset.editing) return;

      const layerId = target.dataset.layerId! as Id<"layers">;
      const name = target.value.trim();

      if (name) {
        await renameLayer({ layerId, name });
      }

      setEditingLayerId(null);
    },
    [renameLayer],
  );

  /* ======================================================
     Render
  ====================================================== */

  return (
    <div className="w-44 h-full border-r bg-sidebar absolute left-0 z-99 overflow-y-auto p-4 flex flex-col gap-2">
      {/* Pages */}
      {pages?.map((page) => (
        <Button
          key={page._id}
          variant={file?.activePage === page._id ? "outline" : "ghost"}
          onClick={() =>
            setActiveLayer({
              designId: activeDesignId as Id<"designs">,
              pageId: page._id,
            })
          }
        >
          {page.name}
        </Button>
      ))}

      {pages && (
        <Button
          onClick={() =>
            addPage({
              designId: activeDesignId as Id<"designs">,
              name: `Page ${pages.length + 1}`,
            })
          }
        >
          Add Page
        </Button>
      )}

      {/* Layers */}
      <div
        className="mt-4 flex flex-col gap-1 overflow-scroll hide-scrollbar"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        {layers?.map((layer) => renderLayerTree(layer))}
      </div>
    </div>
  );
};
