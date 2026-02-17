import { Editor } from "@tiptap/core";
import { v4 as uuid } from "uuid";



interface Selection {
  from: number;
  to: number;
}

/**
 * Build Tiptap-compatible table JSON from headers + rows.
 * Produces: table > tableRow > (tableHeader | tableCell) > tableParagraph
 */
function buildTableNode(headers: string[], rows: string[][]) {
  // Header row
  const headerRow = {
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

  // Data rows
  const dataRows = rows.map((row: string[]) => ({
    type: "tableRow",
    content: row.map((cell: string) => ({
      type: "tableCell",
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [
        {
          type: "tableParagraph",
          content: cell ? [{ type: "text", text: cell }] : [],
        },
      ],
    })),
  }));

  return {
    type: "table",
    attrs: { id: uuid(), rank: "a0" },
    content: [headerRow, ...dataRows],
  };
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

    // Build smartBlockGroup content: either a table or plain paragraphs
    let groupContent: any[];

    if (tableData && tableData.headers && tableData.rows) {
      // Schema / Table: embed a Tiptap table inside the group
      const tableNode = buildTableNode(tableData.headers, tableData.rows);
      groupContent = [
        tableNode,
        { type: "paragraph", attrs: { id: uuid(), rank: "a0V", textAlign: null } },
        { type: "paragraph", attrs: { id: uuid(), rank: "a1", textAlign: null } },
      ];
    } else {
      // Plain text content (code blocks, etc.)
      groupContent = contentText.split('\n').map(line => ({
        type: "paragraph",
        content: line.trim() ? [{ type: "text", text: line }] : [],
      }));
    }

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
