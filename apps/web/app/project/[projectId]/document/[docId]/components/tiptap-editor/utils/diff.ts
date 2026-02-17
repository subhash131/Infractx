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
  
  // console.log("=== CALCULATE DIFF START ===");
  // console.log("Old blocks count:", oldBlocks.length);
  // console.log("New blocks count:", newBlocks.length);
  
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
      // console.log(`[CREATE] Block ${newBlock.id} - not found in old blocks`);
      toCreate.push(newBlock);
    } else {
      // --- UPDATE ---
      // console.log(`\n[CHECKING] Block ${newBlock.id}`);
      const changes: Partial<BlockData> = {};
      let hasChange = false;

      // A. Check Structural Changes (Parent/Rank)
      if (oldBlock.parentId !== newBlock.parentId) {
        // console.log(`  [DIFF] parentId: "${oldBlock.parentId}" → "${newBlock.parentId}"`);
        changes.parentId = newBlock.parentId;
        hasChange = true;
      }
      
      if (oldBlock.rank !== newBlock.rank) {
        // console.log(`  [DIFF] rank: ${oldBlock.rank} → ${newBlock.rank}`);
        // console.log(`    Old rank type: ${typeof oldBlock.rank}`);
        // console.log(`    New rank type: ${typeof newBlock.rank}`);
        changes.rank = newBlock.rank;
        hasChange = true;
      }

      // B. Check Content Changes
      const contentEqual = deepEquals(oldBlock.content, newBlock.content);
      if (!contentEqual) {
        // console.log(`  [DIFF] content changed`);
        // console.log(`    Old:`, JSON.stringify(oldBlock.content, null, 2));
        // console.log(`    New:`, JSON.stringify(newBlock.content, null, 2));
        changes.content = newBlock.content;
        hasChange = true;
      }

      // C. Check Props/Type Changes
      if (oldBlock.type !== newBlock.type) {
        // console.log(`  [DIFF] type: "${oldBlock.type}" → "${newBlock.type}"`);
        changes.type = newBlock.type;
        hasChange = true;
      }
      
      const propsEqual = deepEquals(oldBlock.props, newBlock.props);
      if (!propsEqual) {
        // console.log(`  [DIFF] props changed`);
        // console.log(`    Old:`, JSON.stringify(oldBlock.props, null, 2));
        // console.log(`    New:`, JSON.stringify(newBlock.props, null, 2));
        changes.props = newBlock.props;
        hasChange = true;
      }

      if (hasChange) {
        // console.log(`  [UPDATE] Queuing update with changes:`, Object.keys(changes));
        toUpdate.push({ id: newBlock.id, ...changes });
      } else {
        // console.log(`  [NO CHANGE] Block is identical`);
      }
    }
  }

  // 3. Detect Deletes
  const toDelete: string[] = [];
  for (const oldId of oldMap.keys()) {
    if (!processedIds.has(oldId)) {
      // console.log(`[DELETE] Block ${oldId} - not found in new blocks`);
      toDelete.push(oldId);
    }
  }

  // console.log("\n=== CALCULATE DIFF RESULT ===");
  // console.log("To Create:", toCreate.length);
  // console.log("To Update:", toUpdate.length);
  // console.log("To Delete:", toDelete.length);
  // console.log("=== CALCULATE DIFF END ===\n");

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