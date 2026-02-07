import "@tiptap/core";

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