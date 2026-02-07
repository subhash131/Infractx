import { Node, mergeAttributes } from "@tiptap/core";

export const BlockContent = Node.create({
  name: "blockContent",
  group: "block", // It must be a block to sit inside nestedBlock
  content: "inline*", 
  defining: true,

  parseHTML() {
    return [{ tag: `div[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { 
        class: "bn-block", 
        "data-node-type": this.name,
        style: "outline: none;" 
      }),
      0,
    ];
  },
});