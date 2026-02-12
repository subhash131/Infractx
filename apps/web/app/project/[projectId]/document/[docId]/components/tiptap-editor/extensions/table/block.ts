import { Node, mergeAttributes } from "@tiptap/core";
import { Fragment, Node as PMNode, Schema } from "prosemirror-model";

import { TableExtension } from "./table-extension";

// ─── Table Header ──────────────────

const TiptapTableHeader = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
  name: "tableHeader",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  /**
   * We allow table headers and cells to have multiple tableContent nodes because
   * when merging cells, prosemirror-tables will concat the contents of the cells naively.
   * This would cause that content to overflow into other cells when prosemirror tries to enforce the cell structure.
   *
   * So, we manually fix this up when reading back and only ever place a single tableContent back into the cell.
   */
  content: "tableContent+",

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth
            ? colwidth.split(",").map((width) => parseInt(width, 10))
            : null;

          return value;
        },
      },
    };
  },

  tableRole: "header_cell",

  isolating: true,

  parseHTML() {
    return [
      {
        tag: "th",
        getContent: (node, schema) =>
          parseTableContent(node as HTMLElement, schema),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "th",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

// ─── Table Cell ──────────────────────────────────────────────────────────────

const TiptapTableCell = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
  name: "tableCell",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "tableContent+",

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth
            ? colwidth.split(",").map((width) => parseInt(width, 10))
            : null;

          return value;
        },
      },
    };
  },

  tableRole: "cell",

  isolating: true,

  parseHTML() {
    return [
      {
        tag: "td",
        getContent: (node, schema) =>
          parseTableContent(node as HTMLElement, schema),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

// ─── Table Node ──────────────────────────────────────────────────────────────

const TiptapTableNode = Node.create({
  name: "table",
  content: "tableRow+",
  group: "block",
  tableRole: "table",
  isolating: true,

  parseHTML() {
    return [
      {
        tag: "table",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const colGroup: (string | Record<string, string> | 0)[] = ["colgroup"];

    if (node.firstChild) {
      for (let i = 0; i < node.firstChild.childCount; i++) {
        const tableCell = node.firstChild.child(i);
        const colWidths: null | (number | undefined)[] =
          tableCell.attrs["colwidth"];

        if (colWidths) {
          for (const colWidth of colWidths) {
            if (colWidth) {
              colGroup.push(["col", { style: `width: ${colWidth}px` }] as any);
            } else {
              colGroup.push(["col", {}] as any);
            }
          }
        } else {
          colGroup.push(["col", {}] as any);
        }
      }
    }

    return [
      "div",
      { class: "tableWrapper" },
      ["table", HTMLAttributes, colGroup, ["tbody", 0]],
    ];
  },

  addNodeView() {
    return ({ node }: { node: PMNode; HTMLAttributes: Record<string, string> }) => {
      // Build the DOM manually instead of extending TableView to avoid
      // `findInner` private property type mismatch between prosemirror-view versions.
      const tableWrapper = document.createElement("div");
      tableWrapper.className = "tableWrapper";

      const tableWrapperInner = document.createElement("div");
      tableWrapperInner.className = "tableWrapper-inner";

      const table = document.createElement("table");

      // Build colgroup
      const colgroup = document.createElement("colgroup");
      if (node.firstChild) {
        for (let i = 0; i < node.firstChild.childCount; i++) {
          const cell = node.firstChild.child(i);
          const colwidths: number[] | null = cell.attrs["colwidth"];
          if (colwidths) {
            for (const w of colwidths) {
              const col = document.createElement("col");
              if (w) col.style.width = `${w}px`;
              colgroup.appendChild(col);
            }
          } else {
            colgroup.appendChild(document.createElement("col"));
          }
        }
      }
      table.appendChild(colgroup);

      const tbody = document.createElement("tbody");
      table.appendChild(tbody);

      tableWrapperInner.appendChild(table);
      tableWrapper.appendChild(tableWrapperInner);

      return {
        dom: tableWrapper,
        contentDOM: tbody,
        ignoreMutation: (record: MutationRecord | { type: "selection"; target: globalThis.Node }) => {
          if (record.type === "selection") return false;
          return !(record.target as HTMLElement).closest(".tableWrapper-inner");
        },
      };
    };
  },
});

// ─── Table Paragraph (inline content inside cells) ───────────────────────────

const TiptapTableParagraph = Node.create({
  name: "tableParagraph",
  group: "tableContent",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        getAttrs: (element) => {
          if (typeof element === "string" || !element.textContent) {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.tagName === "TD" || parent.tagName === "TH") {
            return {};
          }

          return false;
        },
        node: "tableParagraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", HTMLAttributes, 0];
  },
});

// ─── Table Row ───────────────────────────────────────────────────────────────

/**
 * This extension allows you to create table rows.
 * @see https://www.tiptap.dev/api/nodes/table-row
 */
const TiptapTableRow = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
  name: "tableRow",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "(tableCell | tableHeader)+",

  tableRole: "row",

  parseHTML() {
    return [{ tag: "tr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "tr",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

// ─── Helper: parse table content ─────────────────────────────────────────────

/**
 * Flattens a node's content to fit into a table cell's paragraph.
 * Extracts all inline nodes from the HTML element.
 */
function parseTableContent(node: HTMLElement, schema: Schema) {
  const extractedContent: PMNode[] = [];

  // DOM nodeType constants (can't use `Node.TEXT_NODE` because `Node` is
  // shadowed by the Tiptap import)
  const TEXT_NODE = 3;
  const ELEMENT_NODE = 1;

  // Walk through child nodes and extract inline text content
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]!;

    if (child.nodeType === TEXT_NODE) {
      // Plain text node
      const text = child.textContent;
      if (text && text.length > 0) {
        extractedContent.push(schema.text(text));
      }
    } else if (child.nodeType === ELEMENT_NODE) {
      const el = child as HTMLElement;

      // For paragraph-like elements, extract their text content
      if (
        el.tagName === "P" ||
        el.tagName === "SPAN" ||
        el.tagName === "DIV"
      ) {
        const text = el.textContent;
        if (text && text.length > 0) {
          // Add a space separator between paragraphs if there's already content
          if (extractedContent.length > 0) {
            extractedContent.push(schema.text(" "));
          }
          extractedContent.push(schema.text(text));
        }
      } else {
        // For inline elements (strong, em, etc.), extract text
        const text = el.textContent;
        if (text && text.length > 0) {
          extractedContent.push(schema.text(text));
        }
      }
    }
  }

  return Fragment.fromArray(extractedContent);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

/**
 * All table-related Tiptap extensions bundled for easy registration.
 * Usage in your editor:
 *
 * ```ts
 * extensions: [
 *   ...TableBlockExtensions,
 *   // ... other extensions
 * ]
 * ```
 */
export const TableBlockExtensions = [
  TableExtension,
  TiptapTableNode,
  TiptapTableParagraph,
  TiptapTableHeader,
  TiptapTableCell,
  TiptapTableRow,
];

export {
  TiptapTableNode,
  TiptapTableHeader,
  TiptapTableCell,
  TiptapTableParagraph,
  TiptapTableRow,
};
