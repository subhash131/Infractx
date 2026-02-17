import { Editor } from "@tiptap/core";
import { handleSmartBlock } from "./smart-block-handler";
import { v4 as uuid } from "uuid";

export const handleAIResponse = async (
  response: Response,
  editor: Editor,
  selection: { from: number; to: number }
) => {
  if (!response.body) {
      console.warn("handleAIResponse: No response body");
      return;
  }

  console.log("🤖 handleAIResponse: Starting to read stream...");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  
  let currentIntent = null;
  let hasStartedStreaming = false;
  let currentBlockTitle = "";

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.log("🤖 handleAIResponse: Stream complete. Final buffer length:", buffer.length);
      if (buffer.trim()) {
        console.log("🤖 handleAIResponse: Processing final buffer:", buffer);
        try {
          const json = JSON.parse(buffer);
          processResponse(json, editor, selection, currentIntent, hasStartedStreaming);
        } catch (e) {
          console.error("❌ handleAIResponse: Error parsing final JSON", e);
          console.error("Buffer content was:", buffer);
        }
      }
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    
    const lines = buffer.split("\n");
    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
       const line = lines[i]?.trim() ?? "";
       if (line && (line.startsWith('{') && line.endsWith('}'))) {
         try {
             const json = JSON.parse(line);
             
             if (json.type === "intent") {
                 currentIntent = json.intent;
                 console.log("🤖 Intent detected:", currentIntent);
             }
             else if (json.type === "title") {
                 currentBlockTitle += json.content;
                 // console.log("🤖 Received Title Chunk:", json.content);
             }
             else if (json.type === "token") {
                 if (currentIntent === "general") {
                     // Log token for chat
                     console.log("Chat Token:", json.content);
                     hasStartedStreaming = true;
                 } else {
                     // Default to editor insertion for text/list/table generation
                     if (currentIntent === 'code' && !hasStartedStreaming) {
                        // First token for code: Insert Smart Block Container
                        const id = uuid();
                        const title = currentBlockTitle.trim() || "Smart Block";
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
                        
                        // Insert the block
                        editor.chain().insertContent(smartBlock).run();


                        // Find the position of the newly inserted block to set selection accurately
                        let foundPos = -1;
                        editor.state.doc.descendants((node, pos) => {
                            if (foundPos > -1) return false;
                            if (node.type.name === 'smartBlock' && node.attrs.id === id) {
                                foundPos = pos;
                                return false;
                            }
                        });

                        if (foundPos > -1) {
                             // SmartBlock -> SmartBlockContent (0) -> SmartBlockGroup (1) -> Paragraph (0)
                             // We want to be inside the paragraph.
                             // Use resolve/nodeAt to be safe, or calculate:
                             // pos + 1 (start of SB) 
                             // + node.child(0).nodeSize (skip content)
                             // + 1 (start of Group)
                             // + 1 (start of Paragraph)
                             // = start of paragraph content
                             
                             const smartBlockNode = editor.state.doc.nodeAt(foundPos);
                             if (smartBlockNode) {
                                 const contentSize = smartBlockNode.child(0).nodeSize;
                                 const groupStart = foundPos + 1 + contentSize;
                                 // The group has a paragraph inside.
                                 // groupStart + 1 is start of paragraph.
                                 // groupStart + 2 is inside paragraph.
                                 const targetPos = groupStart + 2; 

                                 editor.chain().setTextSelection(targetPos).run();
                             }
                        }
                     }
                     
                     if (!hasStartedStreaming) {
                         // For the first token, if we have a valid selection range (from < to), 
                         // we want to ensure we are replacing THAT range, not just inserting 
                         // at whatever the current cursor position happens to be (which might be 0 if focus lost).
                         if (selection && selection.to > selection.from) {
                             editor.chain().setTextSelection(selection).insertContent(json.content).run();
                         } else {
                             editor.chain().insertContent(json.content).run();
                         }
                     } else {
                         editor.chain().insertContent(json.content).run();
                     }

                     hasStartedStreaming = true;
                 }
             }
             else {
                 processResponse(json, editor, selection, currentIntent, hasStartedStreaming);
             }
         } catch(e) {
             // ignore partials
             console.log("🤖 handleAIResponse: Ignoring Partial JSON", line);
         }
       }
    }
    buffer = lines[lines.length - 1] ?? "";
  }

  // After streaming completes, move cursor out of the smart block
  if (currentIntent === 'code' && hasStartedStreaming) {
    // Find the smart block the cursor is currently inside and move after it
    const { $from } = editor.state.selection;
    // Walk up from the current position to find the smartBlock node
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'smartBlock') {
        const after = $from.after(d);
        // Insert a new empty paragraph after the smart block and focus there
        editor.chain()
          .insertContentAt(after, { type: 'paragraph' })
          .setTextSelection(after + 1)
          .run();
        break;
      }
    }
  }
};

const processResponse = (
  response: any, 
  editor: Editor, 
  selection: { from: number; to: number },
  currentIntent: string | null,
  hasStartedStreaming: boolean
) => {
  // Handle Final Response
  if (response.type === "response" && response.response?.operations) {
      console.log(`🤖 processResponse: Processing final operations. Streaming active: ${hasStartedStreaming}`);
      response.response.operations.forEach((op: any) => {
          // If we streamed the content, skip the finalized "replace" or "chat_response" op
          // EXCEPT if it's "delete" or "insert_table" (which might not be streamed via tokens)
          if (hasStartedStreaming && (op.type === "replace" || op.type === "chat_response" || (currentIntent === 'code' && op.type === 'insert_smartblock'))) {
              console.log(`🤖 Skipping ${op.type} because content was streamed.`);
              return;
          }
           // Use original applyOperation logic
          applyOperation(op, editor, selection);
      });
      return;
  }

  // Handle direct single operation (fallback)
  if (response.type && response.type !== "token" && response.type !== "intent") {
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
