import { InputRule, Node } from "@tiptap/core";

export const NestedBlock = Node.create({
  name: "nestedBlock",
  group: "block",
  // KEY CHANGE: This says "I contain one header block, then any number of other blocks"
  content: "blockContent block*", 
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
        // Flex column so children appear below the parent text
        style: "display: flex; flex-direction: column; align-items: flex-start;" 
      },
      // We wrap the Prefix and the Parent Text in a row so they sit side-by-side
      [
        "div",
        { style: "display: flex; width: 100%; align-items: center;" },
        [
          "span", 
          { 
            class: "bn-block-prefix", 
            contenteditable: "false", 
            style: "margin-right: 8px; user-select: none; color: #888;" 
          }, 
          "@" 
        ],
        // The '0' here will render the FIRST child (blockContent) and subsequent children (block*)
        // Tiptap renders content sequentially.
        ["div", { style: "flex: 1; width: 100%" }, 0]
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
            // Step 1: Turn the current paragraph into the "Header" type
            .setNode("blockContent")
            // Step 2: Wrap that Header in our Container
            .wrapIn("nestedBlock")
            .run();
        },
      }),
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // Custom logic: If we are in the 'Header', Enter should create a child
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        const { $from } = selection;

        // Check if we are currently inside the 'blockContent' (the parent text)
        if ($from.parent.type.name === 'blockContent') {
             // Logic to insert a standard paragraph AFTER the current blockContent
             // but INSIDE the nestedBlock
             return this.editor.commands.insertContentAt($from.pos, { type: 'paragraph' });
        }
        
        // Default behavior for other cases
        return false; 
      },
      Backspace: () => {
      const { state } = this.editor.view;
      const { selection } = state;
      const { $from, empty } = selection;

      // 1. Ensure we are in the Header and the cursor is at the very start
      if (!empty || $from.parent.type.name !== 'blockContent' || $from.parentOffset !== 0) {
        return false;
      }

      // 2. The Command Chain
      return this.editor.chain()
        // 'lift' moves the current block OUT of the 'nestedBlock' wrapper
        .lift('nestedBlock') 
        // Then we turn the 'blockContent' into a standard 'paragraph'
        .setNode('paragraph')
        .run();
    }
    }
  }
});