
import { CustomBlockNoteEditor } from "./schema";

export const customSlashMenuItems = [
  {
    title: "Function Documentation",
    onItemClick: (editor: CustomBlockNoteEditor) => {
      editor.insertBlocks(
        [
          {
            type: "function",
            props: {
              name: "myFunction",
              parameters: "[]",
              returnType: "void",
              description: "",
              complexity: "O(n)",
              tags: "[]",
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    aliases: ["func", "fn", "method"],
    group: "Documentation",
    icon: "📦",
  },
  {

    title: "Class Documentation",
    onItemClick: (editor: CustomBlockNoteEditor) => {
      editor.insertBlocks(
        [
          {
            type: "class",
            props: {
              name: "MyClass",
              extends: "",
              implements: "[]",
              description: "",
              properties: "[]",
              methods: "[]",
              isAbstract: false,
              isInterface: false,
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    aliases: ["cls", "interface", "abstract"],
    group: "Documentation",
    icon: "🏛️",
  },
];