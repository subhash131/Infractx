"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BannerExtension from "./custom-editor-types/banner/BannerExtension";

export const RequirementEditor = () => {
  const editor = useEditor({
    extensions: [StarterKit, BannerExtension],
    immediatelyRender: false,
    content: {
      type: "doc",
      content: [
        {
          type: "banner",
          content: [
            {
              type: "text",
              text: "Type your note here...",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Project Requirements" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "How are you?" }],
        },
      ],
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="prose px-4" />;
};
