import { Editor } from "@tiptap/core";
import { v4 as uuid } from "uuid";



interface Selection {
  from: number;
  to: number;
}

export const handleSmartBlock = (
  response: any,
  editor: Editor,
  selection: Selection
) => {
  if (response.type === "smartBlock" || response.type === "insert_smartblock") {
    const { from, to } = selection;

    // Extract title and content
    let title = "Smart Block";
    let contentText = "";

    if (response.content && typeof response.content === 'object') {
        if (response.content.title) title = response.content.title;
        if (response.content.content) contentText = response.content.content;
        
        // Handle Schema intent or other cases where text is in content
        if (response.content.text) title = response.content.text;
    } 
    else if (response.title) {
        title = response.title;
        if (response.content && typeof response.content === 'string') contentText = response.content;
    } 
    else if (response.text) {
        title = response.text;
    }

    const smartBlock = {
      type: "smartBlock",
      attrs: {
        id: uuid(),
      },
      content: [
        {
          type: "smartBlockContent",
          content: [
            {
              type: "text",
              text: title,
            },
          ],
        },
        {
          type: "smartBlockGroup",
          content: contentText.split('\n').map(line => ({
              type: "paragraph",
              content: line.trim() ? [{ type: "text", text: line }] : []
          })),
        },
      ],
    };

    if (to !== null && to !== undefined && from !== to) {
      editor.chain().insertContentAt(to, smartBlock).run();
    }
    if (from === to) {
      const lastPos = editor.state.doc.content.size;
      editor.chain().insertContentAt(lastPos, smartBlock).focus("end").run();
    }
  }
};
