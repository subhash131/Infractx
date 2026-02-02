import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";

// Define the Function block schema
export const FunctionBlock = createReactBlockSpec(
  {
    type: "function" as const,
    propSchema: {
      ...defaultProps,
      name: { default: "Function" },
      parameters: { default: "[]" },
      returnType: { default: "void" },
      description: { default: "" },
      complexity: { default: "O(n)" },
      tags: { default: "[]" },
    },
    content: "inline", // or "none" if you don't want editable text inside
  },
  {
    render: (props) => {
      const { block, editor } = props;
      
      const blockProps = block.props as any;
      const parameters = JSON.parse(blockProps.parameters);
      const tags = JSON.parse(blockProps.tags);
      
      return (
        <div className="function-block" style={{
          border: "2px solid #3b82f6",
          borderRadius: "8px",
          padding: "16px",
          margin: "8px 0",
          backgroundColor: "#eff6ff",
        }}>
          {/* Header */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            marginBottom: "12px"
          }}>
            <span style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              FUNCTION
            </span>
            
            <input
              type="text"
              value={block.props.name}
              onChange={(e) => {
                editor.updateBlock(block.id, {
                  props: { name: e.target.value },
                });
              }}
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                fontFamily: "monospace",
                border: "none",
                background: "transparent",
                outline: "none",
                flex: 1,
              }}
              placeholder="Function name..."
            />
          </div>

          {/* Signature */}
          <div style={{
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            padding: "12px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "14px",
            marginBottom: "12px",
          }}>
            <span style={{ color: "#60a5fa" }}>function</span>{" "}
            <span style={{ color: "#fbbf24" }}>{block.props.name}</span>
            <span style={{ color: "#94a3b8" }}>(</span>
            {parameters.map((param: any, i: number) => (
              <span key={i}>
                <span style={{ color: "#e2e8f0" }}>{param.name}</span>
                <span style={{ color: "#94a3b8" }}>: </span>
                <span style={{ color: "#34d399" }}>{param.type}</span>
                {i < parameters.length - 1 && <span style={{ color: "#94a3b8" }}>, </span>}
              </span>
            ))}
            <span style={{ color: "#94a3b8" }}>)</span>
            <span style={{ color: "#94a3b8" }}>: </span>
            <span style={{ color: "#34d399" }}>{block.props.returnType}</span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ 
              fontSize: "12px", 
              fontWeight: "600",
              color: "#64748b",
              display: "block",
              marginBottom: "4px"
            }}>
              Description
            </label>
            <textarea
              value={block.props.description}
              onChange={(e) => {
                editor.updateBlock(block.id, {
                  props: { description: e.target.value },
                });
              }}
              style={{
                width: "100%",
                minHeight: "60px",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              placeholder="Describe what this function does..."
            />
          </div>

          {/* Parameters Section */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <label style={{ 
                fontSize: "12px", 
                fontWeight: "600",
                color: "#64748b"
              }}>
                Parameters
              </label>
              <button
                onClick={() => {
                  editor.updateBlock(block.id, {
                    props: {
                      parameters: JSON.stringify([
                        ...parameters,
                        { name: "param", type: "string", description: "" }
                      ]),
                    },
                  });
                }}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                + Add Parameter
              </button>
            </div>
            
            {parameters.map((param: any, index: number) => (
              <div key={index} style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 2fr auto",
                gap: "8px",
                marginBottom: "8px",
                padding: "8px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}>
                <input
                  type="text"
                  value={param.name}
                  onChange={(e) => {
                    const newParams = [...parameters];
                    newParams[index] = { ...param, name: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { parameters: JSON.stringify(newParams) },
                    });
                  }}
                  placeholder="name"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
                <input
                  type="text"
                  value={param.type}
                  onChange={(e) => {
                    const newParams = [...parameters];
                    newParams[index] = { ...param, type: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { parameters: JSON.stringify(newParams) },
                    });
                  }}
                  placeholder="type"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
                <input
                  type="text"
                  value={param.description}
                  onChange={(e) => {
                    const newParams = [...parameters];
                    newParams[index] = { ...param, description: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { parameters: JSON.stringify(newParams) },
                    });
                  }}
                  placeholder="description"
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
                <button
                  onClick={() => {
                    const newParams = parameters.filter((_: any, i: number) => i !== index);
                    editor.updateBlock(block.id, {
                      props: { parameters: JSON.stringify(newParams) },
                    });
                  }}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Metadata Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px"
          }}>
            <div>
              <label style={{ 
                fontSize: "12px", 
                fontWeight: "600",
                color: "#64748b",
                display: "block",
                marginBottom: "4px"
              }}>
                Return Type
              </label>
              <input
                type="text"
                value={block.props.returnType}
                onChange={(e) => {
                  editor.updateBlock(block.id, {
                    props: { returnType: e.target.value },
                  });
                }}
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                fontSize: "12px", 
                fontWeight: "600",
                color: "#64748b",
                display: "block",
                marginBottom: "4px"
              }}>
                Complexity
              </label>
              <input
                type="text"
                value={block.props.complexity}
                onChange={(e) => {
                  editor.updateBlock(block.id, {
                    props: { complexity: e.target.value },
                  });
                }}
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
                placeholder="e.g., O(n), O(1)"
              />
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginTop: "12px" }}>
            <label style={{ 
              fontSize: "12px", 
              fontWeight: "600",
              color: "#64748b",
              display: "block",
              marginBottom: "4px"
            }}>
              Tags
            </label>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {tags.map((tag: string, i: number) => (
                <span key={i} style={{
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {tag}
                  <button
                    onClick={() => {
                      const newTags = tags.filter((_: string, idx: number) => idx !== i);
                      editor.updateBlock(block.id, {
                        props: { tags: JSON.stringify(newTags) },
                      });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      padding: 0,
                      color: "#1e40af"
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    editor.updateBlock(block.id, {
                      props: {
                        tags: JSON.stringify([...tags, e.currentTarget.value.trim()]),
                      },
                    });
                    e.currentTarget.value = "";
                  }
                }}
                style={{
                  padding: "2px 8px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      );
    },
  }
);