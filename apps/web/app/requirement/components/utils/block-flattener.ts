import { Block } from "@blocknote/core";

const getRank = (index: number) => index.toString().padStart(6, "0");

export function flattenBlocks(
  blocks: Block[],
  docId: string,
  parentId: string | null = null,
) {
  let flatList: any[] = [];

  blocks.forEach((block, index) => {
    // 1. Create the Flat Row
    const row = {
      blockId: block.id,
      docId: docId,
      parentId: parentId, // Links to its container
      type: block.type,
      props: block.props,
      content: block.content, // Inline text only
      rank: getRank(index), // "000000", "000001"
    };

    flatList.push(row);

    // 2. Recursively flatten children
    // (e.g., items inside a list or column)
    if (block.children && block.children.length > 0) {
      const childrenRows = flattenBlocks(block.children, docId, block.id);
      flatList.push(...childrenRows);
    }
  });

  return flatList;
}
