"use client";

import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { Editor } from "@tiptap/core";
import { isInTable } from "prosemirror-tables";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useRole,
  useDismiss,
  useInteractions,
} from "@floating-ui/react";
import "./table-toolbar.scss";
import {  ArrowDownWideNarrow, ArrowUpNarrowWide, Heading, LucideIcon, Trash } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ColumnDeleteIcon, RowDeleteIcon } from "@hugeicons/core-free-icons";

interface TableToolbarProps {
  editor: Editor | null;
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Floating UI setup
  const { refs, floatingStyles, context, update } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    strategy: "fixed", // Use fixed positioning to avoid scroll offset issues
    middleware: [
      offset(10), // Gap between table and toolbar
      flip(),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const { getFloatingProps } = useInteractions([
    useRole(context),
    useDismiss(context),
  ]);

  const updateVisibility = useCallback(() => {
    if (!editor || !editor.view) return;

    const state = editor.state;
    const inTable = isInTable(state);

    if (inTable) {
      // Find the table DOM element
      const { $head } = state.selection;
      let depth = $head.depth;
      while (depth > 0) {
        const node = $head.node(depth);
        if (node.type.name === "table") {
          const domNode = editor.view.nodeDOM($head.before(depth));
          if (domNode && domNode instanceof HTMLElement) {
            const tableEl = domNode.querySelector("table") || domNode;
            
            // Set the table element as the reference for floating-ui
            refs.setReference(tableEl as HTMLElement);
            setIsOpen(true);
            return;
          }
          break;
        }
        depth--;
      }
    }
    
    setIsOpen(false);
  }, [editor, refs]);

  useEffect(() => {
    if (!editor) return;

    editor.on("selectionUpdate", updateVisibility);
    editor.on("update", updateVisibility);
    
    // Initial check
    updateVisibility();

    return () => {
      editor.off("selectionUpdate", updateVisibility);
      editor.off("update", updateVisibility);
    };
  }, [editor, updateVisibility]);

  // Handle scroll updates manually if needed, but autoUpdate handles most cases. 
  // We add a listener to the scroll container just in case autoUpdate misses rapid scrolls if untracked.
  useEffect(() => {
    const scrollContainer = document.querySelector('.simple-editor-wrapper');
    if (scrollContainer) {
      const handleScroll = () => {
        if (isOpen) update();
      };
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen, update]);


  if (!editor || !isOpen) return null;

  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      className="table-toolbar-btn"
      title={label}
      onClick={(e) => {
        e.preventDefault();
        action();
        editor.commands.focus();
      }}
      disabled={disabled}
    >
      {icon}
    </button>
  );

  return (
    <div
      ref={refs.setFloating}
      className="table-toolbar"
      style={floatingStyles}
      {...getFloatingProps()}
    >
      <div className="table-toolbar-group">
        {btn("Add row above", <ArrowUpNarrowWide size={20}/>, () =>
          editor.commands.addRowBefore()
        )}
        {btn("Add row below", <ArrowDownWideNarrow size={20}/>, () =>
          editor.commands.addRowAfter()
        )}
      </div>
      <div className="table-toolbar-divider" />
      <div className="table-toolbar-group">
        {btn("Add column left", <ArrowUpNarrowWide size={20} className="-rotate-90"/>, () =>
          editor.commands.addColumnBefore()
        )}
        {btn("Add column right", <ArrowDownWideNarrow size={20} className="-rotate-90"/>, () =>
          editor.commands.addColumnAfter()
        )}
      </div>
      <div className="table-toolbar-divider" />
      <div className="table-toolbar-group">
        {btn("Delete row", <HugeiconsIcon icon={RowDeleteIcon} size={20}/>, () =>
          editor.commands.deleteRow()
        )}
        {btn("Delete column", <HugeiconsIcon icon={ColumnDeleteIcon} size={20}/>, () =>
          editor.commands.deleteColumn()
        )}
      </div>
      <div className="table-toolbar-divider" />
      <div className="table-toolbar-group">
        {btn("Toggle header row", <Heading size={16}/>, () =>
          editor.commands.toggleHeaderRow()
        )}
        {btn("Delete table", <Trash size={16}/>, () =>
          editor.commands.deleteTable()
        )}
      </div>
    </div>
  );
}
