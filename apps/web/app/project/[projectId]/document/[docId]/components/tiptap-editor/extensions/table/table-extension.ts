import { callOrReturn, Extension, getExtensionField } from "@tiptap/core";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  mergeCells,
  splitCell,
  tableEditing,
  toggleHeaderRow,
} from "prosemirror-tables";

export const RESIZE_MIN_WIDTH = 35;
export const EMPTY_CELL_WIDTH = 120;
export const EMPTY_CELL_HEIGHT = 31;

declare module "@tiptap/core" {
  interface NodeConfig {
    tableRole?: string;
  }
  interface Commands<ReturnType> {
    tableExtension: {
      addRowBefore: () => ReturnType;
      addRowAfter: () => ReturnType;
      addColumnBefore: () => ReturnType;
      addColumnAfter: () => ReturnType;
      deleteRow: () => ReturnType;
      deleteColumn: () => ReturnType;
      deleteTable: () => ReturnType;
      toggleHeaderRow: () => ReturnType;
      mergeCells: () => ReturnType;
      splitCell: () => ReturnType;
      insertCustomTable: (options?: {
        rows?: number;
        cols?: number;
        withHeaderRow?: boolean;
      }) => ReturnType;
    };
  }
}

export const TableExtension = Extension.create({
  name: "BlockNoteTableExtension",

  addCommands() {
    return {
      addRowBefore:
        () =>
        ({ state, dispatch }) =>
          addRowBefore(state, dispatch),
      addRowAfter:
        () =>
        ({ state, dispatch }) =>
          addRowAfter(state, dispatch),
      addColumnBefore:
        () =>
        ({ state, dispatch }) =>
          addColumnBefore(state, dispatch),
      addColumnAfter:
        () =>
        ({ state, dispatch }) =>
          addColumnAfter(state, dispatch),
      deleteRow:
        () =>
        ({ state, dispatch }) =>
          deleteRow(state, dispatch),
      deleteColumn:
        () =>
        ({ state, dispatch }) =>
          deleteColumn(state, dispatch),
      deleteTable:
        () =>
        ({ state, dispatch }) =>
          deleteTable(state, dispatch),
      toggleHeaderRow:
        () =>
        ({ state, dispatch }) =>
          toggleHeaderRow(state, dispatch),
      mergeCells:
        () =>
        ({ state, dispatch }) =>
          mergeCells(state, dispatch),
      splitCell:
        () =>
        ({ state, dispatch }) =>
          splitCell(state, dispatch),
      insertCustomTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ state, dispatch, editor }) => {
          console.log("TableExtension: insertCustomTable called", { rows, cols, withHeaderRow });
          
          const { table, tableRow, tableHeader, tableCell, tableParagraph } =
            editor.schema.nodes;

          if (!table || !tableRow || !tableHeader || !tableCell || !tableParagraph) {
            console.error("TableExtension: Missing table nodes in schema", {
                table: !!table,
                tableRow: !!tableRow,
                tableHeader: !!tableHeader,
                tableCell: !!tableCell,
                tableParagraph: !!tableParagraph,
            });
            return false;
          }

          try {
              const node = table.create(
                {},
                Array.from({ length: rows }).map((_, rowIndex) => {
                  return tableRow.create(
                    {},
                    Array.from({ length: cols }).map((_, colIndex) => {
                      const cellContent = tableParagraph.create(
                        {},
                        editor.schema.text(" "),
                      );
                      if (withHeaderRow && rowIndex === 0) {
                        return tableHeader.create(
                          {},
                          cellContent, // Direct content, no wrapper
                        );
                      }
                      return tableCell.create(
                        {},
                        cellContent, // Direct content, no wrapper
                      );
                    }),
                  );
                }),
              );
              
              if (dispatch) {
                console.log("TableExtension: Dispatching transaction");
                const tr = state.tr.replaceSelectionWith(node);
                dispatch(tr);
              }
              return true;
          } catch (error) {
              console.error("TableExtension: Error creating table node", error);
              return false;
          }
        },
    };
  },

  addProseMirrorPlugins: () => {
    return [
      columnResizing({
        cellMinWidth: RESIZE_MIN_WIDTH,
        defaultCellMinWidth: EMPTY_CELL_WIDTH,
        // We set this to null as we implement our own node view in the table
        // block content. This node view is the same as what's used by default,
        // but is wrapped in a `blockContent` HTML element.
        View: null,
      }),
      tableEditing(),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Makes enter create a new line within the cell.
      Enter: () => {
        if (
          this.editor.state.selection.empty &&
          this.editor.state.selection.$head.parent.type.name ===
            "tableParagraph"
        ) {
          this.editor.commands.insertContent({ type: "hardBreak" });

          return true;
        }

        return false;
      },
      // Ensures that backspace won't delete the table if the text cursor is at
      // the start of a cell and the selection is empty.
      Backspace: () => {
        const selection = this.editor.state.selection;
        const selectionIsEmpty = selection.empty;
        const selectionIsAtStartOfNode = selection.$head.parentOffset === 0;
        const selectionIsInTableParagraphNode =
          selection.$head.node().type.name === "tableParagraph";

        return (
          selectionIsEmpty &&
          selectionIsAtStartOfNode &&
          selectionIsInTableParagraphNode
        );
      },
      // Enables navigating cells using the tab key.
      Tab: () => {
        return this.editor.commands.command(({ state, dispatch, view }) =>
          goToNextCell(1)(state, dispatch, view),
        );
      },
      "Shift-Tab": () => {
        return this.editor.commands.command(({ state, dispatch, view }) =>
          goToNextCell(-1)(state, dispatch, view),
        );
      },
    };
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    };

    return {
      tableRole: callOrReturn(
        getExtensionField(extension, "tableRole", context),
      ),
    };
  },
});