import React, { useCallback, useMemo, useState } from "react";
import Konva from "konva";
import useCanvas from "./store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Input } from "@workspace/ui/components/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/utils";
import { buildShapeTree } from "./utils";

// Define recursive shape type
type RecursiveShape = {
  _id: Id<"shapes">;
  type: string;
  name?: string;
  children?: RecursiveShape[];
  [key: string]: any;
};

/* ======================================================
   Shape Row (pure render)
====================================================== */

const ShapeRow = React.memo(
  ({
    shape,
    depth,
    isEditing,
    isSelected,
    collapsed,
  }: {
    shape: RecursiveShape;
    depth: number;
    isEditing: boolean;
    isSelected: boolean;
    collapsed: boolean;
  }) => {
    const hasChildren = shape.children && shape.children.length > 0;
    const displayName = shape.name || shape.type || "Untitled";

    return (
      <div
        className={cn(
          "flex items-center group rounded-sm border border-transparent",
          // Visual tweaks: If selected, darker background. If not, hover effect.
          isSelected ? "bg-muted" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: 1 + depth * 10 }}
        data-shape-id={shape._id}
      >
        {/* Toggle Icon */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {hasChildren && (
            <span
              className="text-xs select-none cursor-pointer p-0.5 hover:bg-muted rounded"
              data-collapse-toggle
            >
              {collapsed ? (
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
              ) : (
                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
              )}
            </span>
          )}
        </div>

        {/* Name / Input */}
        <div className="flex-1 min-w-0 py-0.5">
          {isEditing ? (
            <Input
              autoFocus
              defaultValue={displayName}
              className="w-full h-6 text-sm px-1 py-0 border-0 bg-transparent rounded focus-visible:ring-0"
              data-shape-id={shape._id}
              data-editing="true"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            <div
              className={cn(
                "text-xs truncate cursor-pointer select-none px-1 py-0.5 rounded",
                isSelected && "font-medium text-primary", // Optional text bolding
              )}
            >
              {displayName}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ShapeRow.displayName = "ShapeRow";

/* ======================================================
   Main Component
====================================================== */

export const ShapesTree = () => {
  // Store
  const {
    selectedShapeIds,
    setSelectedShapeIds,
    toggleSelectedShapeId,
    setActiveShapeId,
  } = useCanvas();

  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Hardcoded Page ID
  const pageId = "kh7124p2k7ycr4wbf1n710gpc57zeqxt" as Id<"pages">;

  const shapesData = useQuery(api.design.shapes.getShapesByPage, { pageId });
  const updateShape = useMutation(api.design.shapes.updateShape);

  const shapeTree = useMemo(() => {
    return buildShapeTree(shapesData || []);
  }, [shapesData]);

  /* ======================================================
     Recursive Renderer (Updated)
  ====================================================== */

  const renderShapeTree = (
    shape: RecursiveShape,
    depth = 0,
    ancestorActive = false, // New Parameter
  ): React.ReactNode => {
    const isCollapsed = collapsed.has(shape._id);

    // Check if this specific node is explicitly selected
    const isExplicitlySelected = selectedShapeIds.includes(shape._id);

    // It is active if: explicitly selected OR parent was active
    const isActive = isExplicitlySelected || ancestorActive;

    return (
      <React.Fragment key={shape._id}>
        <ShapeRow
          shape={shape}
          depth={depth}
          isEditing={editingId === shape._id}
          isSelected={isActive} // Pass the combined active state
          collapsed={isCollapsed}
        />

        {!isCollapsed &&
          shape.children?.map((child) =>
            // Recursively pass the *current* active state to children
            renderShapeTree(child, depth + 1, isActive),
          )}
      </React.Fragment>
    );
  };

  /* ======================================================
     Event Handlers
  ====================================================== */

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      const row = target.closest("[data-shape-id]");
      const shapeId = row?.getAttribute("data-shape-id");

      if (!shapeId) return;

      // 1. Collapse Logic
      if (target.closest("[data-collapse-toggle]")) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.has(shapeId) ? next.delete(shapeId) : next.add(shapeId);
          return next;
        });
        return;
      }

      // 2. Selection Logic
      setActiveShapeId(shapeId as Id<"shapes">);
      const id = shapeId as Id<"shapes">;

      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleSelectedShapeId(id);
      } else {
        setSelectedShapeIds([id]);
      }
    },
    [toggleSelectedShapeId, setSelectedShapeIds, setActiveShapeId],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const shapeId = target
        .closest("[data-shape-id]")
        ?.getAttribute("data-shape-id");

      if (shapeId) {
        setEditingId(shapeId);
      }
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
        setEditingId(null);
      }
    },
    [],
  );

  const handleBlur = useCallback(
    async (e: React.FocusEvent<HTMLDivElement>) => {
      const target = e.target as HTMLInputElement;
      if (!target.dataset.editing) return;

      const shapeId = target.dataset.shapeId as Id<"shapes">;
      const name = target.value.trim();

      if (shapeId && name) {
        await updateShape({ shapeId, shapeObject: { name } });
      }
      setEditingId(null);
    },
    [updateShape],
  );

  /* ======================================================
     Render
  ====================================================== */

  return (
    <div className="absolute top-0 left-0 w-40 h-screen bg-sidebar border-r z-50 flex flex-col shadow-xl overflow-scroll hide-scrollbar">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Shapes</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {shapesData?.length || 0} Objects
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 hide-scrollbar select-none"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        {!shapesData && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Loading...
          </div>
        )}
        {shapesData && shapeTree.length === 0 && (
          <div className="text-xs text-muted-foreground p-4 text-center">
            Empty Canvas
          </div>
        )}
        {shapeTree.map((shape) => renderShapeTree(shape))}
      </div>
    </div>
  );
};
