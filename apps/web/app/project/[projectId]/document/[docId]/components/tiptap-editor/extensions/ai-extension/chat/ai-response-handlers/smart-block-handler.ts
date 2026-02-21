import { Editor } from "@tiptap/core";
import { v4 as uuid } from "uuid";



interface Selection {
  from: number;
  to: number;
}

/**
 * Build a single table header row for Tiptap.
 */
function buildHeaderRow(headers: string[]) {
  return {
    type: "tableRow",
    content: headers.map((h: string) => ({
      type: "tableHeader",
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [
        {
          type: "tableParagraph",
          content: h ? [{ type: "text", text: h }] : [],
        },
      ],
    })),
  };
}

/**
 * Build a single table data row for Tiptap.
 */
function buildDataRow(cells: string[]) {
  return {
    type: "tableRow",
    content: cells.map((cell: string) => ({
      type: "tableCell",
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [
        {
          type: "tableParagraph",
          content: cell ? [{ type: "text", text: cell }] : [],
        },
      ],
    })),
  };
}

/**
 * Insert a smartBlock with a table, animating row insertion one by one.
 */
function insertAnimatedTable(
  editor: Editor,
  selection: { from: number; to: number },
  title: string,
  tableData: { headers: string[]; rows: string[][] }
) {
  const blockId = uuid();
  const tableId = uuid();

  // Step 1: Insert smartBlock with title + headers-only table
  const smartBlock = {
    type: "smartBlock",
    attrs: { id: blockId },
    content: [
      {
        type: "smartBlockContent",
        content: [{ type: "text", text: title }],
      },
      {
        type: "smartBlockGroup",
        content: [
          {
            type: "table",
            attrs: { id: tableId, rank: "a0" },
            content: [buildHeaderRow(tableData.headers)],
          },
          { type: "paragraph", attrs: { id: uuid(), rank: "a0V", textAlign: null } },
          { type: "paragraph", attrs: { id: uuid(), rank: "a1", textAlign: null } },
        ],
      },
    ],
  };

  const { from, to } = selection;
  if (to !== null && to !== undefined && from !== to) {
    editor.chain().insertContentAt(to, smartBlock).run();
  } else {
    const lastPos = editor.state.doc.content.size;
    editor.chain().insertContentAt(lastPos, smartBlock).focus("end").run();
  }

  // Step 2: Animate row insertion one by one
  const rows = tableData.rows;
  let rowIndex = 0;

  function insertNextRow() {
    if (rowIndex >= rows.length) return;

    // Find the table by its unique ID to get the insert position
    let tableEndPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (tableEndPos > -1) return false;
      if (node.type.name === "table" && node.attrs.id === tableId) {
        // pos + node.nodeSize - 1 = just before the table's closing tag
        tableEndPos = pos + node.nodeSize - 1;
        return false;
      }
    });

    if (tableEndPos > -1) {
      const row = buildDataRow(rows[rowIndex]!);
      editor.chain().insertContentAt(tableEndPos, row).run();
    }

    rowIndex++;
    if (rowIndex < rows.length) {
      setTimeout(insertNextRow, 120);
    } else {
      // Find the smart block end position to place the cursor outside
      let blockEndPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (blockEndPos > -1) return false;
        if (node.type.name === "smartBlock" && node.attrs.id === blockId) {
          blockEndPos = pos + node.nodeSize;
          return false;
        }
      });

      if (blockEndPos > -1) {
        editor.chain()
          .insertContentAt(blockEndPos, { type: "paragraph" })
          .setTextSelection(blockEndPos + 1)
          .focus()
          .run();
      }
    }
  }

  // Start adding rows after a brief initial delay
  setTimeout(insertNextRow, 200);
}

export const handleSmartBlock = (
  response: any,
  editor: Editor,
  selection: Selection
) => {
  if (response.type === "smartBlock" || response.type === "insert_smartblock") {
    const { from, to } = selection;

    // Extract title and content
    let title = "Smart Block";
    let contentText = "";
    let tableData: { headers: string[]; rows: string[][] } | null = null;

    if (response.content && typeof response.content === 'object') {
        if (response.content.title) title = response.content.title;
        if (response.content.content) contentText = response.content.content;
        if (response.content.table) tableData = response.content.table;
        
        // Handle Schema intent or other cases where text is in content
        if (response.content.text) title = response.content.text;
    } 
    else if (response.title) {
        title = response.title;
        if (response.content && typeof response.content === 'string') contentText = response.content;
    } 
    else if (response.text) {
        title = response.text;
    }

    // If table data present, use animated insertion
    if (tableData && tableData.headers && tableData.rows) {
      insertAnimatedTable(editor, { from, to }, title, tableData);
      return;
    }

    // Plain text content (code blocks, etc.)
    const groupContent = contentText.split('\n').map(line => ({
      type: "paragraph",
      content: line.trim() ? [{ type: "text", text: line }] : [],
    }));

    const smartBlock = {
      type: "smartBlock",
      attrs: {
        id: uuid(),
      },
      content: [
        {
          type: "smartBlockContent",
          content: [
            {
              type: "text",
              text: title,
            },
          ],
        },
        {
          type: "smartBlockGroup",
          content: groupContent,
        },
      ],
    };

    if (to !== null && to !== undefined && from !== to) {
      editor.chain().insertContentAt(to, smartBlock).run();
    }
    if (from === to) {
      const lastPos = editor.state.doc.content.size;
      editor.chain().insertContentAt(lastPos, smartBlock).focus("end").run();
    }
  }
};
