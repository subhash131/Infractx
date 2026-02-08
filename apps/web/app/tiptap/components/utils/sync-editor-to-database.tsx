import { Id } from "@workspace/backend/_generated/dataModel";
import { BlockData, TiptapDocument } from "../extensions/types";
import { calculateDiff, DiffResult } from "./diff";
import { parseTiptapDocumentToBlock } from "./parse-tiptap-doc-to-block";

export function syncEditorToDatabase(
  tiptapDoc: TiptapDocument,
  oldBlocks: BlockData[],
  textFileId: Id<"text_files">
): DiffResult {
  // const createBlocks = useMutation(api.requirements.textFileBlocks.bulkCreate);
  // 1. Parse Tiptap document into flat list
  const newBlocks = parseTiptapDocumentToBlock(tiptapDoc, textFileId);
  
  
  // 2. Calculate diff
  const diff = calculateDiff(oldBlocks, newBlocks);
  // const diff = calculateDiff(mockData, newBlocks);
  console.log("diff", diff);
  

  // const res=parseBlocksToTiptapDocument();
  // console.log("res", res);

  const toCreate = diff.toCreate.map((block) => ({
    ...block,
    externalId:block.id,
    textFileId,
  }));

  const toUpdate = diff.toUpdate.map((block) => ({
    ...block,
    externalId:block.id,
    textFileId,
  }));


  return {
    toCreate,
    toUpdate,
    toDelete:diff.toDelete,
  };
 
}