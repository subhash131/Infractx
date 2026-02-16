import { Doc } from "@workspace/backend/_generated/dataModel";
import { BlockData, TiptapDocument, TiptapNode } from "../extensions/types";

export function parseBlocksToTiptapDocument(blocksData: Doc<"blocks">[]): TiptapDocument {
  // 1. Create a map of parentId -> children
  const childrenMap = new Map<string | null | undefined, BlockData[]>();

  const blocks: BlockData[] = blocksData.map(block=>{
    const {_id,externalId,...rest} = block
    return {
      ...rest,
      id: externalId,
    }
  })


  for (const block of blocks) {
    const siblings = childrenMap.get(block.parentId) || [];
    siblings.push(block);
    childrenMap.set(block.parentId, siblings);
  }

  // 2. Sort children by rank within each parent group
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.rank.localeCompare(b.rank));
  }

  // 3. Recursively build nodes
  function buildNode(block: BlockData): TiptapNode {
    if (block.type === "smartBlock") {
      // Find all children where parentId === this block's id
      const children = childrenMap.get(block.id) || [];
      
      // Determine content for smartBlockContent
      let textContent: TiptapNode[] | undefined;
      
      if (Array.isArray(block.content)) {
        // NEW: Rich text content
        textContent = block.content;
      } else if (block.content.text) {
        // OLD: Plain text content
        textContent = [{ type: "text", text: block.content.text }];
      }

      return {
        type: "smartBlock",
        attrs: {
          id: block.id,
          rank: block.rank,
          parentId: block.parentId,
        },
        content: [
          // smartBlockContent with the text
          {
            type: "smartBlockContent",
            content: textContent,
          },
          // smartBlockGroup with children (recursively build each child)
          {
            type: "smartBlockGroup",
            content: children.map(buildNode), // Recursively build child nodes
          },
        ],
      };
    } 
    else if (block.type === "table") {
      return {
        type: "table",
        attrs: {
          id: block.id,
          rank: block.rank,
          parentId: block.parentId,
        },
        content: block.content.tableData,
      };
    }
    
    // Generic handler for all other block types
    const children = childrenMap.get(block.id) || [];
    const content: TiptapNode[] = [];

    if (children.length > 0) {
      content.push(...children.map(buildNode));
    } else if (Array.isArray(block.content)) {
      // NEW: Handle rich text content (array of nodes)
      content.push(...block.content);
    } else if (block.content.text) {
      // OLD: Handle plain text
      content.push({ type: "text", text: block.content.text });
    }

    return {
      type: block.type,
      attrs: {
        id: block.id,
        rank: block.rank,
        parentId: block.parentId,
        ...block.props, // Spread generic props back to attrs
      },
      content: content.length > 0 ? content : undefined,
    };
  }

  // 4. Build root-level nodes (where parentId === null)
  const rootBlocks = childrenMap.get(null) || [];
  
  return {
    type: "doc",
    content: rootBlocks.map(buildNode),
  };
}