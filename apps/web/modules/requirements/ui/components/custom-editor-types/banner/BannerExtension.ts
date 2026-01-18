// BannerExtension.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BannerComponent from "./";

export default Node.create({
  name: "banner",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "banner-component" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["banner-component", mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BannerComponent);
  },
});
