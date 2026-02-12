import { Doc } from "@workspace/backend/_generated/dataModel";
import { generateKeyBetween } from "fractional-indexing";

type TiptapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
};


type TrimmedConvexBlock = Omit<Doc<"blocks">,"textFileId" | "_id" | "_creationTime" | "_updatedTime"|"externalId"|"semanticType">

type ConvexBlock = TrimmedConvexBlock & {
  id: string;
}

/**
 * Main function to convert Tiptap JSON -> Flat Convex Blocks
 */
export function flattenAndRankBlocks(
  doc: TiptapNode, 
  textFileId: string
): ConvexBlock[] {
  if (!doc.content) return [];

  return processNodeList(doc.content, textFileId, null);
}

/**
 * Recursive helper to process a list of nodes and assign ranks
 */
function processNodeList(
  nodes: TiptapNode[],
  textFileId: string,
  parentId: string | null
): ConvexBlock[] {
  const result: ConvexBlock[] = [];
  
  // 1. Generate ranks for the entire list at once
  // This creates evenly spaced keys: "a0", "a1", "a2"...
  let lastRank: string | null = null;
  
  nodes.forEach((node) => {
    // Generate a rank that comes strictly after the previous one
    // (If you were inserting between existing items, you'd pass the next rank as 2nd arg)
    const newRank = generateKeyBetween(lastRank, null); 
    lastRank = newRank;

    const blockId = node.attrs?.id;

    if (!blockId) {
      console.warn("Found block without ID, skipping:", node.type);
      return;
    }

    // --- HANDLE SMARTBLOCK ---
    if (node.type === "smartBlock") {
      // A. Extract "Header" Content
      const contentNode = node.content?.find(n => n.type === "smartBlockContent");
      // Getting the raw text or the prosemirror fragment for the header
      const headerContent = contentNode?.content || []; 

      // B. Create the Parent Block
      result.push({
        // textFileId,
        id: blockId,
        parentId: parentId,
        type: "smartBlock",
        content: headerContent, // Store the header content here
        rank: newRank,
        props: node.attrs,
        
      });

      // C. Process Children (inside smartBlockGroup)
      const groupNode = node.content?.find(n => n.type === "smartBlockGroup");
      if (groupNode && groupNode.content) {
        // RECURSION: Pass the current block's ID as the new parentId
        const children = processNodeList(groupNode.content, textFileId, blockId);
        result.push(...children);
      }
    } 
    
    // --- HANDLE REGULAR BLOCKS (Paragraph, etc.) ---
    else {
      result.push({
        // textFileId,
        id: blockId,
        parentId: parentId,
        type: node.type,
        content: node.content, // Store inner content (e.g. text nodes)
        rank: newRank,
        props: node.attrs,
        
      });
    }
  });

  return result;
}