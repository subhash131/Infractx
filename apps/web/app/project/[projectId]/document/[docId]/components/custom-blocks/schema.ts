import { BlockNoteSchema, defaultBlockSpecs, Block, BlockSchemaFromSpecs } from "@blocknote/core";
import { FunctionBlock } from "./function-block";
import { ClassBlock } from "./class-block";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,

    function: FunctionBlock(),
    class: ClassBlock(),

  },
});

export type CustomBlockNoteEditor = typeof schema.BlockNoteEditor;
export type CustomBlock = Block<BlockSchemaFromSpecs<typeof schema.blockSpecs>>;
