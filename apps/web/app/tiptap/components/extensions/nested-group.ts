import { Node } from "@tiptap/core";

export const NestedBlockGroup = Node.create({
  name: "nestedBlockGroup",
  group: "block",
  // This node holds all the children (paragraphs, images, etc.)
  content: "block+", 
  defining: true,

  parseHTML() {
    return [{ tag: `div[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { 
        "data-node-type": "nestedBlockGroup",
        // This gives you the desired indentation for the whole group
        style: "padding-left: 10px; width: 100%; border-left: 1px solid gray;" 
      },
      0 // Renders all children inside this div
    ];
  }
});