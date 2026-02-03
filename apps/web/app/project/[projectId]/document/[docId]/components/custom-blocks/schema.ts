import { BlockNoteSchema, defaultBlockSpecs, Block, BlockSchemaFromSpecs, PartialBlock } from "@blocknote/core";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

export type CustomBlockNoteEditor = typeof schema.BlockNoteEditor;
export type CustomBlock = Block<BlockSchemaFromSpecs<typeof schema.blockSpecs>>;
export type CustomPartialBlock = PartialBlock<BlockSchemaFromSpecs<typeof schema.blockSpecs>>;
