import { Editor } from "@tiptap/core";
import { generateKeyBetween } from "fractional-indexing";
import { v4 as uuid } from "uuid";



interface Selection {
  from: number;
  to: number;
}

function generateSafeRank(prevRank: string | null, nextRank: string | null): string {
  try {
    if (prevRank && nextRank && prevRank >= nextRank) {
      return generateKeyBetween(prevRank, null);
    }
    return generateKeyBetween(prevRank, nextRank);
  } catch {
    return generateKeyBetween(prevRank, null);
  }
}

function normalizeInsertedSmartBlock(editor: Editor, smartBlockId: string) {
  let smartBlockPos = -1;
  let smartBlockNode: any = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "smartBlock" && node.attrs.id === smartBlockId) {
      smartBlockPos = pos;
      smartBlockNode = node;
      return false;
    }
    return true;
  });

  if (smartBlockPos < 0 || !smartBlockNode) return;

  const tr = editor.state.tr;
  let modified = false;

  const $smartPos = editor.state.doc.resolve(smartBlockPos);
  const parent = $smartPos.parent;
  const indexInParent = $smartPos.index();

  const prevRank =
    indexInParent > 0 && typeof parent.child(indexInParent - 1)?.attrs?.rank === "string"
      ? parent.child(indexInParent - 1).attrs.rank
      : null;
  const nextRank =
    indexInParent < parent.childCount - 1 && typeof parent.child(indexInParent + 1)?.attrs?.rank === "string"
      ? parent.child(indexInParent + 1).attrs.rank
      : null;

  const currentSmartRank = typeof smartBlockNode.attrs.rank === "string" ? smartBlockNode.attrs.rank : null;
  const shouldFixSmartRank =
    !currentSmartRank ||
    (prevRank !== null && currentSmartRank <= prevRank) ||
    (nextRank !== null && currentSmartRank >= nextRank);

  if (shouldFixSmartRank) {
    tr.setNodeMarkup(smartBlockPos, undefined, {
      ...smartBlockNode.attrs,
      rank: generateSafeRank(prevRank, nextRank),
    });
    modified = true;
  }

  let groupNode: any = null;
  let groupPos = -1;

  smartBlockNode.forEach((child: any, offset: number) => {
    if (groupNode) return;
    if (child.type.name === "smartBlockGroup") {
      groupNode = child;
      groupPos = smartBlockPos + 1 + offset;
    }
  });

  if (groupNode && groupPos > -1) {
    let runningPos = groupPos + 1;
    let lastRank: string | null = null;

    for (let i = 0; i < groupNode.childCount; i++) {
      const child = groupNode.child(i);
      const childPos = runningPos;
      runningPos += child.nodeSize;

      if (!child.isBlock) continue;

      const childAttrs = (child.attrs ?? {}) as Record<string, any>;
      const nextId = typeof childAttrs.id === "string" && childAttrs.id ? childAttrs.id : uuid();
      const nextRank = generateSafeRank(lastRank, null);
      const nextAttrs = {
        ...childAttrs,
        id: nextId,
        rank: nextRank,
      };
      lastRank = nextRank;

      if (nextId !== childAttrs.id || nextRank !== childAttrs.rank) {
        tr.setNodeMarkup(childPos, undefined, nextAttrs);
        modified = true;
      }
    }
  }

  if (modified) {
    editor.view.dispatch(tr);
  }
}

function insertSmartBlockAtSelection(
  editor: Editor,
  selection: Selection,
  smartBlock: Record<string, any>,
  smartBlockId: string
) {
  const { from, to } = selection;

  if (to !== null && to !== undefined && from !== to) {
    editor.chain().insertContentAt(to, smartBlock).run();
  } else {
    const lastPos = editor.state.doc.content.size;
    editor.chain().insertContentAt(lastPos, smartBlock).focus("end").run();
  }

  normalizeInsertedSmartBlock(editor, smartBlockId);
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
            attrs: { id: tableId },
            content: [buildHeaderRow(tableData.headers)],
          },
          { type: "paragraph" },
          { type: "paragraph" },
        ],
      },
    ],
  };

  insertSmartBlockAtSelection(editor, selection, smartBlock, blockId);

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

    insertSmartBlockAtSelection(editor, { from, to }, smartBlock, smartBlock.attrs.id);
  } else if (response.type === "insert_smartblock_mention") {
    const { from, to } = selection;
    const { label, fileName } = response.content || {};

    const mentionNode = {
      type: "smartBlockMention",
      attrs: {
        blockId: uuid(), // Mock or real depending on backend support needed. Usually expects externalId.
        label: label || "Untitled",
        fileId: null, // Depending on if we have file ID. We usually just pass fileName string from AI.
        fileName: fileName || null,
      },
    };

    if (to !== null && to !== undefined && from !== to) {
      editor.chain().insertContentAt(to, mentionNode).run();
    } else {
      const lastPos = editor.state.doc.content.size;
      editor.chain().insertContentAt(lastPos, mentionNode).focus("end").run();
    }
  }
};
