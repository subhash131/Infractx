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
    // Handle paragraph nodes
    else if (node.type === "paragraph") {
      const blockId = node.attrs?.id;
      const rank = node.attrs?.rank;
      const textAlign = node.attrs?.textAlign;

      if (!blockId || !rank) {
        console.warn("paragraph missing id or rank", node);
        return;
      }

      const contentText = extractTextContent(node);

      blocks.push({
        id: blockId,
        parentId,
        type: "paragraph",
        content: { text: contentText },
        rank,
        props: {
          textAlign: textAlign || null,
        },
        textFileId,
      });
    }
    // Handle other block types if needed
    else if (node.content) {
      // Recursively process children for other node types
      for (const child of node.content) {
        traverse(child, parentId);
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