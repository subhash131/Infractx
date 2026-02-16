import { InputRule, Node } from "@tiptap/core";

export const SmartBlock = Node.create({
  name: "smartBlock", 
  group: "block",
  content: "smartBlockContent smartBlockGroup", 
  defining: true,

  parseHTML() {
    return [{ tag: `div[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        id: HTMLAttributes["data-id"] || undefined,
        class: "bn-block-outer",
        "data-node-type": "blockOuter",
        style: "display: flex; flex-direction: row; align-items: flex-start;"
      },
      [
        "span",
        {
          class: "bn-block-prefix",
          contenteditable: "false",
          style: "user-select: none; color: rgb(136, 136, 136); margin-right: 2px; margin-top: 0px;"
        },
        "@"
      ],
      [
        "div",
        {
          class: "bn-content-wrapper",
          style: "flex: 1; width: 100%; display: flex; flex-direction: column;"
        },
        0 
      ]
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\/\/$/, 
        handler: ({ state, chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .insertContent({
              type: "smartBlock", // Updated
              content: [
                { type: "smartBlockContent" }, // Updated
                {
                  type: "smartBlockGroup", // Updated
                  content: [
                    { type: "paragraph" }
                  ]
                }
              ]
            })
            .setTextSelection(range.from + 1)
            .run();
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, dispatch } = this.editor.view;
        const { $from } = state.selection;

        // Updated reference to smartBlockContent
        if ($from.parent.type.name === "smartBlockContent") {
          const smartBlock = $from.node(-1);
          const groupPos = $from.start(-1) + smartBlock.child(0).nodeSize;
          
          return this.editor.commands.insertContentAt(groupPos + 1, { type: "paragraph" });
        }

        return false;
      },
      Backspace: () => {
        const { state, dispatch } = this.editor.view;
        const { $from, empty } = state.selection;

        // Only handle if cursor is in smartBlockContent
        if ($from.parent.type.name === "smartBlockContent") {
          const content = $from.parent.textContent;
          
          // If there's content, allow normal backspace behavior
          if (content.length > 0) {
            return false;
          }
          
          // If content is empty and cursor is at the start, delete the entire smartBlock
          if (content.length === 0 && $from.parentOffset === 0 && empty) {
            const smartBlockPos = $from.start(-1) - 1; // Position before the smartBlock
            const smartBlockSize = $from.node(-1).nodeSize;
            
            return this.editor.commands.deleteRange({
              from: smartBlockPos,
              to: smartBlockPos + smartBlockSize
            });
          }
        }
        
        return false;
      }
    };
  },
});