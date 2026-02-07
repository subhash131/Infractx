import { InputRule, Node } from "@tiptap/core";

export const NestedBlock = Node.create({
  name: "nestedBlock",
  group: "block",
  // SCHEMA CHANGE: Enforce 1 Header, followed by 1 Group
  content: "blockContent nestedBlockGroup", 
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
      // The Prefix
      [
        "span",
        {
          class: "bn-block-prefix",
          contenteditable: "false",
          style: "user-select: none; color: rgb(136, 136, 136); margin-right: 2px; margin-top: 0px;"
        },
        "@"
      ],
      // The Wrapper for Header + Group
      [
        "div",
        {
          class: "bn-content-wrapper",
          style: "flex: 1; width: 100%; display: flex; flex-direction: column;"
        },
        0 // This renders <blockContent> first, then <nestedBlockGroup>
      ]
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\/\/$/, // Matches "//" at the start of a line
        handler: ({ state, chain, range }) => {
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .insertContent({
              type: "nestedBlock",
              content: [
                { type: "blockContent" }, // The Header (Parent)
                {
                  type: "nestedBlockGroup", // The Wrapper
                  content: [
                    { type: "paragraph" } // The Child
                  ]
                }
              ]
            })
            // FORCE CURSOR POSITION:
            // range.from = Start of the new NestedBlock
            // + 1 = Step inside NestedBlock
            // + 1 = Step inside BlockContent (Header)
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

        // Custom Logic: If pressing Enter inside the Header (blockContent)
        if ($from.parent.type.name === "blockContent") {
          // 1. Find the 'nestedBlock' (grandparent)
          const nestedBlock = $from.node(-1);
          // 2. Determine where the 'nestedBlockGroup' starts
          // The group is the second child, so pos = startPos + headerNodeSize
          const groupPos = $from.start(-1) + nestedBlock.child(0).nodeSize;
          
          // 3. Insert a paragraph at the START of the group (pos + 1 to go inside)
          // We use +1 to step into the nestedBlockGroup node
          return this.editor.commands.insertContentAt(groupPos + 1, { type: "paragraph" });
        }

        return false;
      },
    };
  },
});