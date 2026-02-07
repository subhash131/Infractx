import { Node } from "@tiptap/core";

export const SmartBlockGroup = Node.create({
  name: "smartBlockGroup", 
  group: "block",
  content: "block+", 
  defining: true,

  parseHTML() {
    return [{ tag: `div[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { 
        "data-node-type": "smartBlockGroup", // Renamed
        style: "padding-left: 10px; width: 100%; border-left: 1px solid gray;" 
      },
      0 
    ];
  }
});