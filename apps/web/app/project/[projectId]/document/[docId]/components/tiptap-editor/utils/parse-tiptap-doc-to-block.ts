import { Id } from "@workspace/backend/_generated/dataModel";
import { BlockData, TiptapDocument, TiptapNode } from "../extensions/types";

export function parseTiptapDocumentToBlock(
  doc: TiptapDocument,
  textFileId: Id<"text_files">
): BlockData[] {
  const blocks: BlockData[] = [];

  function traverse(node: TiptapNode, parentId: string | null = null) {
    // Handle smartBlock nodes
    if (node.type === "smartBlock") {
      const blockId = node.attrs?.id;
      const rank = node.attrs?.rank;

      if (!blockId || !rank) {
        console.warn("smartBlock missing id or rank", node);
        return;
      }

      // Extract content from smartBlockContent
      const smartBlockContent = node.content?.find(
        (n) => n.type === "smartBlockContent"
      );
      const contentText = extractTextContent(smartBlockContent);

      // Create the smartBlock entry
      blocks.push({
        id: blockId,
        parentId,
        type: "smartBlock",
        content: { text: contentText },
        rank,
        props: {}, // Add any custom props from node.attrs if needed
        textFileId,
      });

      // Process children in smartBlockGroup
      const smartBlockGroup = node.content?.find(
        (n) => n.type === "smartBlockGroup"
      );
      if (smartBlockGroup?.content) {
        for (const child of smartBlockGroup.content) {
          traverse(child, blockId);
        }
      }
    }
    // Handle table nodes — store the entire table as a single block
    else if (node.type === "table") {
      const blockId = node.attrs?.id;
      const rank = node.attrs?.rank;

      if (!blockId || !rank) {
        console.warn("table missing id or rank", node);
        return;
      }

      blocks.push({
        id: blockId,
        parentId,
        type: "table",
        content: { tableData: node.content },
        rank,
        props: {},
        textFileId,
      });
    }
    // Generic handler for all other block types (paragraph, heading, list, etc.)
    else {
      const blockId = node.attrs?.id;
      const rank = node.attrs?.rank;

      // If the node has an ID and rank, treat it as a block
      if (blockId && rank) {
        const contentText = extractTextContent(node);
        
        // Extract all attributes as props, excluding reserved internal attributes
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, rank: _rank, ...otherAttrs } = node.attrs || {};

        blocks.push({
          id: blockId,
          parentId,
          type: node.type,
          content: { text: contentText },
          rank,
          props: otherAttrs,
          textFileId,
        });

        // Traverse children for this block
        if (node.content) {
          for (const child of node.content) {
            traverse(child, blockId);
          }
        }
      } else {
         // If it's a structural node (like a list wrapper without ID) or we just processed it as a block
        // check if it has children that also need to be traversed.
        if (node.content) {
          for (const child of node.content) {
            traverse(child, parentId);
          }
        }
      }
    }
  }

  // Start traversal from doc.content
  if (doc.content) {
    for (const node of doc.content) {
      traverse(node, null);
    }
  }

  return blocks;
}

function extractTextContent(node: TiptapNode | undefined): string {
  if (!node) return "";
  
  let text = "";
  
  function collectText(n: TiptapNode) {
    if (n.text) {
      text += n.text;
    }
    if (n.content) {
      for (const child of n.content) {
        collectText(child);
      }
    }
  }
  
  collectText(node);
  return text;
}