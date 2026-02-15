import { Editor } from "@tiptap/core";
import { handleSmartBlock } from "./smart-block-handler";

export const handleAIResponse = async (
  response: Response,
  editor: Editor,
  selection: { from: number; to: number }
) => {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    
    // Process all complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]?.trim() ?? "";
      if (line) {
        try {
          const json = JSON.parse(line);
          processResponse(json, editor, selection);
        } catch (e) {
          console.error("Error parsing JSON", e);
        }
      }
    }
    
    // Keep the last partial line in the buffer
    buffer = lines[lines.length - 1] ?? "";
  }
};

const processResponse = (
  response: any, 
  editor: Editor, 
  selection: { from: number; to: number }
) => {
  if (response.type === "smartBlock") {
    handleSmartBlock(response, editor, selection);
  } else if (response.type === "paragraph") {
      // For now, handle paragraph same way or add specific handler
      // If no specific handler, maybe just insert text?
      // Based on previous code, smartBlockHandler seems to do insertion.
      // Let's assume for now we might need a paragraph handler or reuse smartBlock
      // But prompt asked for: 1st: {type: "smartBlock"...}, 2nd: {type: "paragraph"...}
      
      // If we don't have a specific paragraph handler yet, we can simple insert it
      // or map it to smartBlock if compatible. 
      // Checking smart-block-handler.ts: it inserts content based on selection.
      
       editor.chain().insertContentAt(editor.state.selection.to, response.text).run();
  }
}
