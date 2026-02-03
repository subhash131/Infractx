import { generateKeyBetween } from "fractional-indexing";
import { CustomBlock } from "../custom-blocks/schema";

export function calculateSmartDiff(
  oldBlocks: CustomBlock[], 
  newBlocks: CustomBlock[],
  blockRanks: Map<string, string> // NEW: Receive ranks map
) {
  const oldMap = new Map<string,
    { block: CustomBlock; rank: string; parentId: string | null }
  >();
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const processedIds = new Set<string>();

  // 1. Index old blocks AND populate with known ranks
  const indexOld = (blocks: CustomBlock[], parent: string | null = null) => {
    for (const b of blocks) {
      // Try to get rank from our persistent map
      const dbRank = blockRanks.get(b.id) || (b as any).rank || "";
      
      // console.log(`  🔍 Indexing old [${b.id.slice(0, 6)}] with rank: ${dbRank || 'MISSING'}`);
      
      oldMap.set(b.id, { block: b, parentId: parent, rank: dbRank });
      
      if (b.children?.length) indexOld(b.children, b.id);
    }
  };
  
  // console.log("🏗️  Building oldMap from lastSavedState...");
  indexOld(oldBlocks);

  // 2. Enhanced content comparison helper with deep object comparison
  const deepEquals = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => deepEquals(val, b[idx]));
    }
    
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => deepEquals(a[key], b[key]));
    }
    
    return false;
  };

  const hasContentChanged = (newContent: any, oldContent: any) => {
    // Use deep comparison for all content types
    return !deepEquals(newContent, oldContent);
  };

  // 3. Deep props comparison
  const hasPropsChanged = (newProps: any, oldProps: any) => {
    const normalize = (props: any) => {
      if (!props) return {};
      const normalized: any = {};
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined && value !== null && value !== '') {
          normalized[key] = value;
        }
      }
      return normalized;
    };

    const normalizedNew = normalize(newProps);
    const normalizedOld = normalize(oldProps);

    return !deepEquals(normalizedNew, normalizedOld);
  };

  const traverse = (blocks: CustomBlock[], parentId: string | null = null) => {
    // console.log(`\n📂 Traversing ${blocks.length} blocks (parent: ${parentId?.slice(0, 6) || 'root'})`);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block) continue;
      
      processedIds.add(block.id);
      const oldEntry = oldMap.get(block.id);

      let targetRank: string;
      let needsRankUpdate = false;
      let updateReason: string | null = null;

      if (!oldEntry) {
        // --- NEW BLOCK ---
        // console.log(`\n🆕 NEW BLOCK [${block.id.slice(0, 6)}] at position ${i}`);
        
        // Find PREVIOUS block's rank
        let prevRank: string | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const prevId = blocks[j]!.id;
          const prevRankValue = blockRanks.get(prevId);
          if (prevRankValue) {
            prevRank = prevRankValue;
            // console.log(`  ⬅️  Found prevRank from [${prevId.slice(0, 6)}]: ${prevRank}`);
            break;
          }
        }
        if (!prevRank) console.log(`  ⬅️  No previous rank (start of list)`);

        // Find NEXT block's rank
        let nextRank: string | null = null;
        for (let j = i + 1; j < blocks.length; j++) {
          const nextId = blocks[j]!.id;
          const nextRankValue = blockRanks.get(nextId);
          if (nextRankValue) {
            nextRank = nextRankValue;
            // console.log(`  ➡️  Found nextRank from [${nextId.slice(0, 6)}]: ${nextRank}`);
            break;
          }
        }
        if (!nextRank) console.log(`  ➡️  No next rank (end of list)`);

        targetRank = generateKeyBetween(prevRank, nextRank);
        // console.log(`  ✨ Generated rank: ${targetRank}`);
        
        // CRITICAL: Store the rank IMMEDIATELY so next blocks can use it
        blockRanks.set(block.id, targetRank);
        // console.log(`  💾 Stored rank in map for future blocks`);
        
        toCreate.push({ ...block, rank: targetRank, parentId });
        
      } else {
        // --- EXISTING BLOCK ---
        targetRank = oldEntry.rank;
        // console.log(`\n♻️  EXISTING BLOCK [${block.id.slice(0, 6)}] current rank: ${targetRank || 'MISSING'}`);
        
        // Check if parent changed
        const movedParent = oldEntry.parentId !== parentId;
        
        if (movedParent) {
          // console.log(`  🔄 PARENT CHANGED! Old: ${oldEntry.parentId?.slice(0, 6) || 'root'} → New: ${parentId?.slice(0, 6) || 'root'}`);
          
          // Find PREVIOUS block's rank
          let prevRank: string | null = null;
          for (let j = i - 1; j >= 0; j--) {
            const prevId = blocks[j]!.id;
            const prevRankValue = blockRanks.get(prevId);
            if (prevRankValue) {
              prevRank = prevRankValue;
              // console.log(`  ⬅️  Found prevRank from [${prevId.slice(0, 6)}]: ${prevRank}`);
              break;
            }
          }

          // Find NEXT block's rank
          let nextRank: string | null = null;
          for (let j = i + 1; j < blocks.length; j++) {
            const nextId = blocks[j]!.id;
            const nextRankValue = blockRanks.get(nextId);
            if (nextRankValue) {
              nextRank = nextRankValue;
              // console.log(`  ➡️  Found nextRank from [${nextId.slice(0, 6)}]: ${nextRank}`);
              break;
            }
          }
          
          targetRank = generateKeyBetween(prevRank, nextRank);
          needsRankUpdate = true;
          updateReason = "Parent Changed";
          // console.log(`  ✨ Generated new rank: ${targetRank}`);
          
          // CRITICAL: Store the updated rank IMMEDIATELY
          blockRanks.set(block.id, targetRank);
          // console.log(`  💾 Stored updated rank in map`);
        }

        // Check for content/props changes
        const contentChanged = hasContentChanged(block.content, oldEntry.block.content);
        const propsChanged = hasPropsChanged(block.props, oldEntry.block.props);
        const typeChanged = block.type !== oldEntry.block.type;

     
        // if (propsChanged) console.log(`  ⚙️  Props changed`);
        // if (typeChanged) console.log(`  🔄 Type changed`);

        if (needsRankUpdate || contentChanged || propsChanged || typeChanged) {
          const updatePayload: any = { id: block.id };
          
          if (needsRankUpdate) {
            updatePayload.rank = targetRank;
            updatePayload.parentId = parentId;
          }
          if (contentChanged) updatePayload.content = block.content;
          if (propsChanged) updatePayload.props = block.props;
          if (typeChanged) updatePayload.type = block.type;
          
          toUpdate.push(updatePayload);
        }
      }

      // Recurse into children
      if (block.children?.length) traverse(block.children, block.id);
    }
  };

  traverse(newBlocks);

  // 4. Detect Deletes
  const toDelete: string[] = [];
  for (const key of oldMap.keys()) {
    if (!processedIds.has(key)) {
      // console.log(`🗑️  DELETED: [${key.slice(0, 6)}]`);
      toDelete.push(key);
    }
  }

  return { toCreate, toUpdate, toDelete };
}