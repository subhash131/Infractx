import { BlockNoteSchema, defaultBlockSpecs, defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

const SmartBlock = createReactBlockSpec(
  {
    type: "smartBlock",
    propSchema: {
      ...defaultProps,
      semanticType: {
        default: "default",
        values: ["default", "class", "function", "schema", "custom"],
      },
    },
    content: "inline", 
  },
  {
    render: ({ block, contentRef }) => {
      return (
        <div className={`smart-block type-${block.props.semanticType}`}>
           <div ref={contentRef} />
        </div>
      );
    },
  }
);

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    smartBlock: SmartBlock(),
  },
});

export type CustomBlockNoteEditor = typeof schema.BlockNoteEditor;
export type CustomBlock = typeof schema.Block;