import { Block } from "@blocknote/core";
import { generateRank } from "./rank-generator";

// ==========================================
// 🧠 THE PRODUCTION DIFF ENGINE (Smart)
// ==========================================

export function calculateSmartDiff(oldBlocks: Block[], newBlocks: Block[]) {
  // 1. Index Old Blocks (Simulating DB State)
  // We need to know what Ranks we assigned previously
  const oldMap = new Map();

  // Helper to extract ranks from the "Last Saved" structure
  // In a real app, `lastSavedState` would already be flat or carry ranks.
  // Here we reconstruct ranks assuming sequential order if missing.
  const indexOld = (
    blocks: Block[],
    parent: string | null,
    startRank = 1000,
  ) => {
    blocks.forEach((b, i) => {
      const rank = `0|${(startRank + i * 1000).toString().padStart(6, "0")}`;
      oldMap.set(b.id, { ...b, parentId: parent, rank }); // Store assumed DB rank
      if (b.children) indexOld(b.children, b.id, startRank + i * 1000);
    });
  };

  indexOld(oldBlocks, null);

  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const processedIds = new Set();

  // 2. Traverse New Blocks to Determine Ranks
  const traverse = (blocks: Block[], parentId: string | null = null) => {
    let prevRank: string | null = null;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];

      if (!block) break;

      processedIds.add(block.id);
      const oldBlock = oldMap.get(block.id);

      let targetRank = oldBlock?.rank;
      let needsUpdate = false;

      // --- RANK LOGIC ---
      if (!oldBlock) {
        // A. New Block: Needs a rank between prev and next
        const nextRankHint = nextBlock ? oldMap.get(nextBlock.id)?.rank : null;
        targetRank = generateRank(prevRank, nextRankHint);
      } else {
        // B. Existing Block: Only move if order is violated
        if (oldBlock.parentId !== parentId) {
          // Changed parent -> needs new rank context
          const nextRankHint = nextBlock
            ? oldMap.get(nextBlock.id)?.rank
            : null;
          targetRank = generateRank(prevRank, nextRankHint);
          needsUpdate = true;
        } else if (prevRank && oldBlock.rank <= prevRank) {
          // Order violation -> needs repair
          const nextRankHint = nextBlock
            ? oldMap.get(nextBlock.id)?.rank
            : null;
          targetRank = generateRank(prevRank, nextRankHint);
          needsUpdate = true;
        } else {
          // Happy path: Keep old rank!
          targetRank = oldBlock.rank;
        }
      }

      // Update Cursor
      prevRank = targetRank;

      // --- BUILD OUTPUT ---
      if (!oldBlock) {
        toCreate.push({ ...block, rank: targetRank, parentId });
      } else {
        // Check content changes
        const contentChanged =
          JSON.stringify(block.content) !== JSON.stringify(oldBlock.content);
        const propsChanged =
          JSON.stringify(block.props) !== JSON.stringify(oldBlock.props);

        if (needsUpdate || contentChanged || propsChanged) {
          toUpdate.push({
            id: block.id,
            ...(needsUpdate ? { rank: targetRank, parentId } : {}),
            ...(contentChanged ? { content: block.content } : {}),
            ...(propsChanged ? { props: block.props } : {}),
          });
        }
      }

      if (block.children) traverse(block.children, block.id);
    }
  };

  traverse(newBlocks);

  // 3. Detect Deletes
  const toDelete: string[] = [];
  oldMap.forEach((v, k) => {
    if (!processedIds.has(k)) toDelete.push(k);
  });

  return { toCreate, toUpdate, toDelete };
}
