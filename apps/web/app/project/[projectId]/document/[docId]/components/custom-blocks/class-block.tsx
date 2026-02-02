import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";

export const ClassBlock = createReactBlockSpec(
  {
    type: "class" as const,
    propSchema: {
      ...defaultProps,
      name: { default: "Class" },
      extends: { default: "" },
      implements: { default: "[]" },
      description: { default: "" },
      properties: { default: "[]" },
      methods: { default: "[]" },
      isAbstract: { default: false },
      isInterface: { default: false },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      
      const getStringProp = (prop: string) => {
        try {
          return JSON.parse(prop);
        } catch (e) {
          return [];
        }
      };

      const implementsList = getStringProp(block.props.implements as string);
      const properties = getStringProp(block.props.properties as string);
      const methods = getStringProp(block.props.methods as string);
      
      const blockType = block.props.isInterface ? "INTERFACE" : 
                        block.props.isAbstract ? "ABSTRACT CLASS" : "CLASS";
      const borderColor = block.props.isInterface ? "#8b5cf6" : 
                          block.props.isAbstract ? "#f59e0b" : "#10b981";
      const bgColor = block.props.isInterface ? "#f5f3ff" : 
                      block.props.isAbstract ? "#fffbeb" : "#ecfdf5";
      
      return (
        <div className="class-block" style={{
          border: `2px solid ${borderColor}`,
          borderRadius: "8px",
          padding: "16px",
          margin: "8px 0",
          backgroundColor: bgColor,
        }}>
          {/* Header */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap"
          }}>
            <span style={{
              backgroundColor: borderColor,
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              {blockType}
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
                minWidth: "150px"
              }}
              placeholder="Class name..."
            />
            
            {/* Type toggles */}
            <div style={{ display: "flex", gap: "8px" }}>
              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="checkbox"
                  checked={block.props.isAbstract}
                  onChange={(e) => {
                    editor.updateBlock(block.id, {
                      props: { 
                        isAbstract: e.target.checked,
                        isInterface: false 
                      },
                    });
                  }}
                />
                Abstract
              </label>
              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="checkbox"
                  checked={block.props.isInterface}
                  onChange={(e) => {
                    editor.updateBlock(block.id, {
                      props: { 
                        isInterface: e.target.checked,
                        isAbstract: false 
                      },
                    });
                  }}
                />
                Interface
              </label>
            </div>
          </div>

          {/* Inheritance */}
          <div style={{
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            padding: "12px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "14px",
            marginBottom: "12px",
          }}>
            <span style={{ color: "#60a5fa" }}>
              {block.props.isInterface ? "interface" : "class"}
            </span>{" "}
            <span style={{ color: "#fbbf24" }}>{block.props.name}</span>
            {block.props.extends && (
              <>
                {" "}<span style={{ color: "#60a5fa" }}>extends</span>{" "}
                <span style={{ color: "#34d399" }}>{block.props.extends}</span>
              </>
            )}
            {implementsList.length > 0 && (
              <>
                {" "}<span style={{ color: "#60a5fa" }}>implements</span>{" "}
                <span style={{ color: "#34d399" }}>
                  {implementsList.join(", ")}
                </span>
              </>
            )}
          </div>

          {/* Inheritance inputs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "12px"
          }}>
            <div>
              <label style={{ 
                fontSize: "12px", 
                fontWeight: "600",
                color: "#64748b",
                display: "block",
                marginBottom: "4px"
              }}>
                Extends
              </label>
              <input
                type="text"
                value={block.props.extends}
                onChange={(e) => {
                  editor.updateBlock(block.id, {
                    props: { extends: e.target.value },
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
                placeholder="Base class..."
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
                Implements (comma-separated)
              </label>
              <input
                type="text"
                value={implementsList.join(", ")}
                onChange={(e) => {
                  const interfaces = e.target.value
                    .split(",")
                    .map(s => s.trim())
                    .filter(Boolean);
                  editor.updateBlock(block.id, {
                    props: { implements: JSON.stringify(interfaces) },
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
                placeholder="Interface1, Interface2..."
              />
            </div>
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
                resize: "vertical",
              }}
              placeholder="Describe this class..."
            />
          </div>

          {/* Properties Section */}
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
                Properties
              </label>
              <button
                onClick={() => {
                  editor.updateBlock(block.id, {
                    props: {
                      properties: JSON.stringify([
                        ...properties,
                        { name: "property", type: "string", visibility: "public", description: "" }
                      ]),
                    },
                  });
                }}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: borderColor,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                + Add Property
              </button>
            </div>
            
            {properties.map((prop: any, index: number) => (
              <div key={index} style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 1fr 2fr auto",
                gap: "8px",
                marginBottom: "8px",
                padding: "8px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}>
                <select
                  value={prop.visibility}
                  onChange={(e) => {
                    const newProps = [...properties];
                    newProps[index] = { ...prop, visibility: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { properties: JSON.stringify(newProps) },
                    });
                  }}
                  style={{
                    padding: "4px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="protected">protected</option>
                </select>
                <input
                  type="text"
                  value={prop.name}
                  onChange={(e) => {
                    const newProps = [...properties];
                    newProps[index] = { ...prop, name: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { properties: JSON.stringify(newProps) },
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
                  value={prop.type}
                  onChange={(e) => {
                    const newProps = [...properties];
                    newProps[index] = { ...prop, type: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { properties: JSON.stringify(newProps) },
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
                  value={prop.description}
                  onChange={(e) => {
                    const newProps = [...properties];
                    newProps[index] = { ...prop, description: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { properties: JSON.stringify(newProps) },
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
                    const newProps = properties.filter((_: any, i: number) => i !== index);
                    editor.updateBlock(block.id, {
                      props: { properties: JSON.stringify(newProps) },
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

          {/* Methods Section */}
          <div>
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
                Methods
              </label>
              <button
                onClick={() => {
                  editor.updateBlock(block.id, {
                    props: {
                      methods: JSON.stringify([
                        ...methods,
                        { name: "method", parameters: "", returnType: "void", visibility: "public", description: "" }
                      ]),
                    },
                  });
                }}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: borderColor,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                + Add Method
              </button>
            </div>
            
            {methods.map((method: any, index: number) => (
              <div key={index} style={{
                marginBottom: "8px",
                padding: "8px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 1.5fr 1fr auto",
                  gap: "8px",
                  marginBottom: "4px"
                }}>
                  <select
                    value={method.visibility}
                    onChange={(e) => {
                      const newMethods = [...methods];
                      newMethods[index] = { ...method, visibility: e.target.value };
                      editor.updateBlock(block.id, {
                        props: { methods: JSON.stringify(newMethods) },
                      });
                    }}
                    style={{
                      padding: "4px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <option value="public">public</option>
                    <option value="private">private</option>
                    <option value="protected">protected</option>
                  </select>
                  <input
                    type="text"
                    value={method.name}
                    onChange={(e) => {
                      const newMethods = [...methods];
                      newMethods[index] = { ...method, name: e.target.value };
                      editor.updateBlock(block.id, {
                        props: { methods: JSON.stringify(newMethods) },
                      });
                    }}
                    placeholder="methodName"
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
                    value={method.parameters}
                    onChange={(e) => {
                      const newMethods = [...methods];
                      newMethods[index] = { ...method, parameters: e.target.value };
                      editor.updateBlock(block.id, {
                        props: { methods: JSON.stringify(newMethods) },
                      });
                    }}
                    placeholder="param1: type1, param2: type2"
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
                    value={method.returnType}
                    onChange={(e) => {
                      const newMethods = [...methods];
                      newMethods[index] = { ...method, returnType: e.target.value };
                      editor.updateBlock(block.id, {
                        props: { methods: JSON.stringify(newMethods) },
                      });
                    }}
                    placeholder="returnType"
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    onClick={() => {
                      const newMethods = methods.filter((_: any, i: number) => i !== index);
                      editor.updateBlock(block.id, {
                        props: { methods: JSON.stringify(newMethods) },
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
                <input
                  type="text"
                  value={method.description}
                  onChange={(e) => {
                    const newMethods = [...methods];
                    newMethods[index] = { ...method, description: e.target.value };
                    editor.updateBlock(block.id, {
                      props: { methods: JSON.stringify(newMethods) },
                    });
                  }}
                  placeholder="Method description..."
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    },
  }
);