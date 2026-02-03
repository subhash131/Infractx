import { Block } from "@blocknote/core";
import { Doc } from "@workspace/backend/_generated/dataModel";

export const transformToBlockNoteStructure = (
  blocks: Doc<"blocks">[]
): Block[] => {
  const blockMap = new Map<string, Block & { children: Block[]; rank: string; parentId: string }>();
  const rootBlocks: Block[] = [];

  // 1. Create blocks - PRESERVE THE RANK!
  blocks.forEach((block) => {
    blockMap.set(block.externalId, {
      id: block.externalId,
      type: block.type as any,
      props: block.props as any,
      content: block.content as any,
      children: [],
      rank: block.rank, 
      parentId: block.parentId ?? "",
    });
  });

  // 2. Sort by rank (authoritative)
  const sortedBlocks = sortByRank(blocks);

  // 3. Build tree
  sortedBlocks.forEach((block) => {
    const node = blockMap.get(block.externalId)!;
    if (block.parentId && blockMap.has(block.parentId)) {
      console.log({blockParent:block.parentId})
      blockMap.get(block.parentId)!.children.push(node);
    } else {
      rootBlocks.push(node);
    }
  });

  return rootBlocks;
};

export function sortByRank<T extends { rank?: string }>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) =>
    (a.rank ?? "").localeCompare(b.rank ?? "")
  );
}