import { Node, mergeAttributes } from "@tiptap/core";

export const SmartBlockContent = Node.create({
  name: "smartBlockContent", 
  group: "block",
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