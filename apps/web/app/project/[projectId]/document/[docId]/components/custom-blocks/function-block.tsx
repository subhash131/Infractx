import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";

/**
 * FUNCTION BLOCK - Parent Container
 * Structure:
 * @function:functionName(param1-Type, param2-Type)
 *   ├─ Body blocks (any nested content)
 *   └─ Return block
 */
export const FunctionBlock = createReactBlockSpec(
  {
    type: "function" as const,
    propSchema: {
      ...defaultProps,
      functionName: { default: "myFunction" },
      parameters: { default: "" },
    },
    content: "inline", // Allows nested child blocks
  },
  {
    render: (props) => {
      const { block, editor, contentRef } = props;
      
      return (
        <div 
          className="bn-block-function"
          style={{
            backgroundColor: "#1e1e1e",
            borderLeft: "3px solid #569cd6",
            borderRadius: "4px",
            padding: "12px",
            margin: "8px 0",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: "14px",
            color: "#d4d4d4",
          }}
        >
          {/* Function Header/Signature */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: "1px solid #2d2d2d",
          }}>
            <span style={{ 
              color: "#569cd6", 
              fontWeight: "600",
              fontSize: "13px",
            }}>
              @function:
            </span>
            
            <input
              type="text"
              value={block.props.functionName}
              onChange={(e) => {
                editor.updateBlock(block.id, {
                  props: { functionName: e.target.value },
                });
              }}
              style={{
                fontSize: "14px",
                fontFamily: "inherit",
                border: "none",
                background: "transparent",
                outline: "none",
                color: "#dcdcaa",
                padding: 0,
                minWidth: "80px",
              }}
              placeholder="functionName"
            />
            
            <span style={{ color: "#808080" }}>(</span>
            
            <input
              type="text"
              value={block.props.parameters}
              onChange={(e) => {
                editor.updateBlock(block.id, {
                  props: { parameters: e.target.value },
                });
              }}
              style={{
                fontSize: "14px",
                fontFamily: "inherit",
                border: "none",
                background: "transparent",
                outline: "none",
                color: "#9cdcfe",
                padding: 0,
                flex: 1,
                minWidth: "120px",
              }}
              placeholder="newItem-string, arr-Array"
            />
            
            <span style={{ color: "#808080" }}>)</span>
          </div>
          
          {/* Child blocks container */}
          <div 
            ref={contentRef}
            style={{
              paddingLeft: "12px",
            }}
          />
        </div>
      );
    },
  }
);

/**
 * VARIABLE DECLARATION BLOCK
 * Usage: @var:variableName = value
 */
export const VariableBlock = createReactBlockSpec(
  {
    type: "variable" as const,
    propSchema: {
      ...defaultProps,
      varName: { default: "temp" },
      value: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      
      return (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            margin: "4px 0",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: "14px",
          }}
        >
          <span style={{ color: "#569cd6", fontSize: "13px" }}>@var:</span>
          
          <input
            type="text"
            value={block.props.varName}
            onChange={(e) => {
              editor.updateBlock(block.id, {
                props: { varName: e.target.value },
              });
            }}
            style={{
              fontSize: "14px",
              fontFamily: "inherit",
              border: "none",
              background: "transparent",
              outline: "none",
              color: "#9cdcfe",
              padding: 0,
              minWidth: "60px",
            }}
            placeholder="varName"
          />
          
          <span style={{ color: "#d4d4d4" }}>=</span>
          
          <input
            type="text"
            value={block.props.value}
            onChange={(e) => {
              editor.updateBlock(block.id, {
                props: { value: e.target.value },
              });
            }}
            style={{
              fontSize: "14px",
              fontFamily: "inherit",
              border: "none",
              background: "transparent",
              outline: "none",
              color: "#ce9178",
              padding: 0,
              flex: 1,
            }}
            placeholder="value"
          />
        </div>
      );
    },
  }
);

/**
 * ACTION/STATEMENT BLOCK
 * Usage: add .newItem to .temp
 */
export const ActionBlock = createReactBlockSpec(
  {
    type: "action" as const,
    propSchema: {
      ...defaultProps,
    },
    content: "inline",
  },
  {
    render: (props) => {
      const { contentRef } = props;
      
      return (
        <div 
          style={{
            margin: "4px 0",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: "14px",
            color: "#d4d4d4",
          }}
        >
          <div 
            ref={contentRef}
            style={{
              outline: "none",
            }}
          />
        </div>
      );
    },
  }
);

/**
 * RETURN BLOCK
 * Usage: return .temp
 */
export const ReturnBlock = createReactBlockSpec(
  {
    type: "return" as const,
    propSchema: {
      ...defaultProps,
      returnValue: { default: "" },
      returnType: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      
      return (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            margin: "4px 0",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: "14px",
          }}
        >
          <span style={{ color: "#c586c0", fontWeight: "600" }}>return</span>
          
          <input
            type="text"
            value={block.props.returnValue}
            onChange={(e) => {
              editor.updateBlock(block.id, {
                props: { returnValue: e.target.value },
              });
            }}
            style={{
              fontSize: "14px",
              fontFamily: "inherit",
              border: "none",
              background: "transparent",
              outline: "none",
              color: "#9cdcfe",
              padding: 0,
              flex: 1,
            }}
            placeholder=".temp"
          />
          
          {block.props.returnType && (
            <>
              <span style={{ color: "#808080" }}>:</span>
              <span style={{ color: "#4ec9b0" }}>{block.props.returnType}</span>
            </>
          )}
        </div>
      );
    },
  }
);