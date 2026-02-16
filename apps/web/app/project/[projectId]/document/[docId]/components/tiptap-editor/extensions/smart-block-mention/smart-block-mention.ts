import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SmartBlockMentionView } from "./smart-block-mention-view";

export interface SmartBlockMentionAttrs {
  blockId: string | null;
  label: string | null;
  fileId: string | null;
  fileName: string | null;
}

export interface SmartBlockMentionOptions {
  HTMLAttributes: Record<string, any>;
}

export const SmartBlockMention = Node.create<SmartBlockMentionOptions>({
  name: "smartBlockMention",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-block-id"),
        renderHTML: (attributes: { blockId?: string | null }) => {
          if (!attributes.blockId) return {};
          return { "data-block-id": attributes.blockId };
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label"),
        renderHTML: (attributes: { label?: string | null }) => {
          if (!attributes.label) return {};
          return { "data-label": attributes.label };
        },
      },
      fileId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file-id"),
        renderHTML: (attributes: { fileId?: string | null }) => {
          if (!attributes.fileId) return {};
          return { "data-file-id": attributes.fileId };
        },
      },
      fileName: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file-name"),
        renderHTML: (attributes: { fileName?: string | null }) => {
          if (!attributes.fileName) return {};
          return { "data-file-name": attributes.fileName };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="smart-block-mention"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-type": "smart-block-mention" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `⚡ ${HTMLAttributes["data-label"] || "Untitled"}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SmartBlockMentionView, { as: "span" });
  },
});
