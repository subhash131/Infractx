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
    };
  },
});