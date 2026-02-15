import { Editor } from "@tiptap/core";
import { v4 as uuid } from "uuid";

interface SmartBlockResponse {
  type: string;
  text: string;
}

interface Selection {
  from: number;
  to: number;
}

export const handleSmartBlock = (
  response: SmartBlockResponse,
  editor: Editor,
  selection: Selection
) => {
  if (response.type === "smartBlock") {
    const { from, to } = selection;
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
              text: response.text,
            },
          ],
        },
        {
          type: "smartBlockGroup",
          content: [
            {
              type: "paragraph",
            },
          ],
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
