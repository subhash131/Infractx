import "@tiptap/core";

import { Doc } from "@workspace/backend/_generated/dataModel";

export type TrimmedBlockData = Omit<Doc<"blocks">, "id" |"createdAt" | "updatedAt" | "externalId"|"_id"|"_creationTime" >

export type BlockData =TrimmedBlockData & {
  id: string; // externalId
};

export type TiptapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
};

export type TiptapDocument = {
  type: "doc";
  content: TiptapNode[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    globalBlockAttributes: {
      /**
       * Manually assign unique IDs to all blocks that are missing them.
       */
      assignIds: () => ReturnType;
    };
  }
}