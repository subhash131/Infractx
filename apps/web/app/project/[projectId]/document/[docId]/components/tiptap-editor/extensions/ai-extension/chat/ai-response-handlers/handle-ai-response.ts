import { Editor } from "@tiptap/core";
import { handleSmartBlock } from "./smart-block-handler";

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
             else if (json.type === "token") {
                 hasStartedStreaming = true;
                 if (currentIntent === "general") {
                     // Log token for chat
                     console.log("Chat Token:", json.content);
                 } else {
                     // Default to editor insertion for text/list/table generation
                     editor.chain().insertContent(json.content).run();
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
          if (hasStartedStreaming && (op.type === "replace" || op.type === "chat_response")) {
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
  } else if (op.type === "chat_response") {
       console.log("🤖 AI Chat Response:", op.content);
  } else {
      console.warn("🤖 applyOperation: Unknown operation type:", op.type);
  }
}
