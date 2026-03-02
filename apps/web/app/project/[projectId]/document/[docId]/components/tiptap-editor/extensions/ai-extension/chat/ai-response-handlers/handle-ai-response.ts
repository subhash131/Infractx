import { Editor } from "@tiptap/core";
import { handleSmartBlock } from "./smart-block-handler";
import { v4 as uuid } from "uuid";

export const handleAIStream = async (
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
  editor: Editor,
  selection: { from: number; to: number },
  onChatToken: (token: string) => void
) => {
  console.log(`🤖 handleAIStream: Starting stream for conversation ${conversationId}`);
  
  const state = {
    currentIntent: null as string | null,
    hasStartedStreaming: false,
    currentBlockTitle: ""
  };

  let fullChatResponseText = ""; // Accumulate AI response if needed

  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Keep the incomplete chunk in the buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        
        try {
          const jsonStr = line.slice(6); // Remove "data: "
          const json = JSON.parse(jsonStr);

          if (json.type === "done" || json.type === "error") {
             // We can break, but we'll let the stream finish gracefully
             continue;
          }

          if (json.type === "intent") {
              state.currentIntent = json.intent;
              console.log("🤖 Intent detected:", state.currentIntent);
          }
          else if (json.type === "title") {
              state.currentBlockTitle += json.content;
          }
          else if (json.type === "doc_token" || json.type === "chat_token" || json.type === "token") {
              if (state.currentIntent === "general" || json.type === "chat_token") {
                  onChatToken(json.content);
                  fullChatResponseText += json.content;
                  state.hasStartedStreaming = true;
              } else {
                  // Text/Code doc edits
                  if (state.currentIntent === 'code' && !state.hasStartedStreaming) {
                    const id = uuid();
                    const title = state.currentBlockTitle.trim() || "Smart Block";
                    console.log("🤖 Creating Smart Block with title:", title);
                    
                    const smartBlock = {
                        type: "smartBlock",
                        attrs: { id },
                        content: [
                            {
                                type: "smartBlockContent",
                                content: [{ type: "text", text: title }]
                            },
                            {
                                type: "smartBlockGroup",
                                content: [{ type: "paragraph" }] // Empty paragraph to start
                            }
                        ]
                    };
                    
                    editor.chain().insertContent(smartBlock).run();

                    let foundPos = -1;
                    editor.state.doc.descendants((node, pos) => {
                        if (foundPos > -1) return false;
                        if (node.type.name === 'smartBlock' && node.attrs.id === id) {
                            foundPos = pos;
                            return false;
                        }
                    });

                    if (foundPos > -1) {
                          const smartBlockNode = editor.state.doc.nodeAt(foundPos);
                          if (smartBlockNode) {
                              const contentSize = smartBlockNode.child(0).nodeSize;
                              const groupStart = foundPos + 1 + contentSize;
                              const targetPos = groupStart + 2; 
                              editor.chain().setTextSelection(targetPos).run();
                          }
                    }
                  }
                  
                  if (!state.hasStartedStreaming) {
                      if (selection && selection.to > selection.from) {
                          editor.chain().setTextSelection(selection).insertContent(json.content).run();
                      } else {
                          editor.chain().insertContent(json.content).run();
                      }
                  } else {
                      editor.chain().insertContent(json.content).run();
                  }

                  state.hasStartedStreaming = true;
              }
          }
          else {
              processResponse(json, editor, selection, state);
          }
        } catch (err) {
            console.error("Failed to parse SSE line:", line, err);
        }
      }
    }
  } catch (e) {
    console.error("Streaming error", e);
  } finally {
    reader.releaseLock();
  }

  // After completion
  console.log("🤖 handleAIStream: Done.");
  
  if (state.currentIntent === 'code' && state.hasStartedStreaming) {
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'smartBlock') {
        const after = $from.after(d);
        editor.chain()
          .insertContentAt(after, { type: 'paragraph' })
          .setTextSelection(after + 1)
          .run();
        break;
      }
    }
  }

  return fullChatResponseText;
};

const processResponse = (
  response: any, 
  editor: Editor, 
  selection: { from: number; to: number },
  state: { hasStartedStreaming: boolean, currentIntent: string | null }
) => {
  // Handle Final Response
  if (response.type === "response" && response.response?.operations) {
      console.log(`🤖 processResponse: Processing final operations. Streaming active: ${state.hasStartedStreaming}`);
      response.response.operations.forEach((op: any) => {
          if (state.hasStartedStreaming && (op.type === "replace" || op.type === "chat_response" || (state.currentIntent === 'code' && op.type === 'insert_smartblock'))) {
              console.log(`🤖 Skipping ${op.type} because content was streamed.`);
              return;
          }
          applyOperation(op, editor, selection);
      });
      return;
  }

  // Handle direct single operation (fallback)
  if (response.type && !["token", "intent", "chat_token", "doc_token", "title"].includes(response.type)) {
      applyOperation(response, editor, selection);
  }
}


const applyOperation = (
  op: any,
  editor: Editor,
  selection: { from: number; to: number }
) => {
  console.log(`🤖 applyOperation: Applying operation type '${op.type}'`, op);

  if (op.type === "smartBlock" || op.type === "insert_smartblock") {
    handleSmartBlock(op, editor, selection);
  } else if (op.type === "paragraph") {
       editor.chain().insertContentAt(editor.state.selection.to, op.text).run();
  } else if (op.type === "replace") {
       const { from, to } = selection;
       console.log(`🤖 Replacing text at range: ${from}-${to}`);
       editor.chain().setTextSelection({ from, to }).insertContent(op.content).run();
  } else if (op.type === "delete") {
       const { from, to } = selection;
       console.log(`🤖 Soft deleting text at range: ${from}-${to}`);
       editor.chain().setTextSelection({ from, to }).setStrike().run();
  } else if (op.type === "insert_table") {
       // Wrap as a smartBlock with table content for consistent rendering
       const wrappedOp = {
           type: "insert_smartblock",
           position: op.position,
           content: {
               title: op.content?.title || "Table",
               table: {
                   headers: op.content?.headers || [],
                   rows: op.content?.rows || [],
               }
           }
       };
       handleSmartBlock(wrappedOp, editor, selection);
  } else if (op.type === "chat_response") {
       console.log("🤖 AI Chat Response:", op.content);
  } else {
      console.warn("🤖 applyOperation: Unknown operation type:", op.type);
  }
}
