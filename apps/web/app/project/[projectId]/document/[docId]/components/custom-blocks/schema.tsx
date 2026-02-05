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
          <div className={`smart-block type-${block.props.semanticType}`} data-content-type="smartBlock"
           data-semantic-type={block.props.semanticType}
          >
            <div className="smart-block-header" ref={contentRef} />
          </div>
        );
      },
      parse: (element) => {
        if (!element || !element.getAttribute) {
          console.error("❌ Invalid element received in parse:", element);
          return undefined;
        }
        
        const contentType = element.getAttribute("data-content-type");
        const semanticType = element.getAttribute("data-semanticType");
        
        if (contentType !== "smartBlock") {
          return undefined;
        }
        
        if (!semanticType || !["default", "class", "function", "schema", "custom"].includes(semanticType)) {
          console.error("❌ Invalid semanticType:", semanticType);
          return undefined;
        }
        
        console.log("✅ Successfully parsed smartBlock with type:", semanticType);
        
        return {
          semanticType: semanticType as "default" | "class" | "function" | "schema" | "custom",
        };
      },
    }
  );




 
const DecoratorBlock = createReactBlockSpec(
  {
    type: "decoratorBlock",
    propSchema: {
      ...defaultProps,
      decoratorType: {
        default: "none",
        values: ["none", "class", "function", "schema", "module", "custom"],
      },
      decoratorName: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const { decoratorType, decoratorName } = block.props;
      
      return (
        <div 
          className={`decorator-block decorator-${decoratorType}`}
          data-content-type="decoratorBlock"
          data-decorator-type={decoratorType}
          data-decorator-name={decoratorName}
        >
          {decoratorType !== "none" && (
            <div className="decorator-header">
              <span className="decorator-symbol">@{decoratorType}:</span>
              <input
                type="text"
                className="decorator-name-input"
                value={decoratorName}
                onChange={(e) => {
                  editor.updateBlock(block, {
                    props: { decoratorName: e.target.value },
                  });
                }}
                placeholder={`Enter ${decoratorType} name...`}
              />
            </div>
          )}
        </div>
      );
    },
    
    parse: (element) => {
      if (!element?.getAttribute) return undefined;
      
      const contentType = element.getAttribute("data-content-type");
      if (contentType !== "decoratorBlock") return undefined;
      
      const decoratorType = element.getAttribute("data-decorator-type");
      const decoratorName = element.getAttribute("data-decorator-name") || "";
      
      if (!decoratorType || !["none", "class", "function", "schema", "module", "custom"].includes(decoratorType)) {
        return undefined;
      }
      
      return {
        decoratorType: decoratorType as "none" | "class" | "function" | "schema" | "module" | "custom",
        decoratorName: decoratorName,
      };
    },
  }
);

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    smartBlock: SmartBlock(), 
    decoratorBlock: DecoratorBlock(),
  },
});

export type CustomBlockNoteEditor = typeof schema.BlockNoteEditor;
export type CustomBlock = typeof schema.Block;