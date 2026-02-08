import { BlockData } from "../extensions/types";

export type DiffResult = {
  toCreate: BlockData[];
  toUpdate: (Partial<BlockData> & { id: string })[];
  toDelete: string[];
};

export function calculateDiff(
  oldBlocks: BlockData[],
  newBlocks: BlockData[]
): DiffResult {
  
  const toCreate: BlockData[] = [];
  const toUpdate: (Partial<BlockData> & { id: string })[] = [];
  const processedIds = new Set<string>();

  // 1. Index Old Blocks for O(1) Lookup
  const oldMap = new Map<string, BlockData>();
  for (const block of oldBlocks) {
    oldMap.set(block.id, block);
  }

  // 2. Iterate New Blocks (The "Truth")
  for (const newBlock of newBlocks) {
    processedIds.add(newBlock.id);
    const oldBlock = oldMap.get(newBlock.id);

    if (!oldBlock) {
      // --- CREATE ---
      toCreate.push(newBlock);
    } else {
      // --- UPDATE ---
      const changes: Partial<BlockData> = {};
      let hasChange = false;

      // A. Check Structural Changes (Parent/Rank)
      if (oldBlock.parentId !== newBlock.parentId) {
        changes.parentId = newBlock.parentId;
        hasChange = true;
      }
      if (oldBlock.rank !== newBlock.rank) {
        changes.rank = newBlock.rank;
        hasChange = true;
      }

      // B. Check Content Changes
      if (!deepEquals(oldBlock.content, newBlock.content)) {
        changes.content = newBlock.content;
        hasChange = true;
      }

      // C. Check Props/Type Changes
      if (oldBlock.type !== newBlock.type) {
        changes.type = newBlock.type;
        hasChange = true;
      }
      if (!deepEquals(oldBlock.props, newBlock.props)) {
        changes.props = newBlock.props;
        hasChange = true;
      }

      if (hasChange) {
        toUpdate.push({ id: newBlock.id, ...changes });
      }
    }
  }

  // 3. Detect Deletes
  const toDelete: string[] = [];
  for (const oldId of oldMap.keys()) {
    if (!processedIds.has(oldId)) {
      toDelete.push(oldId);
    }
  }

  return { toCreate, toUpdate, toDelete };
}

function deepEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEquals(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}