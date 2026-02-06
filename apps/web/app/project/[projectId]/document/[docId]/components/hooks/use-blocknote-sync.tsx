// import { useMemo } from "react";
// import {
//   type Block,
//   BlockNoteEditor,
//   type BlockNoteEditorOptions,
//   nodeToBlock,
// } from "@blocknote/core";
// import {
//   UseSyncOptions,
//   useTiptapSync,
// } from "@convex-dev/prosemirror-sync/tiptap";
// import { SyncApi } from "@convex-dev/prosemirror-sync";

// // We simply the type definition to allow passing any standard BlockNote options
// export type BlockNoteSyncOptions = UseSyncOptions & {
//   editorOptions?: Partial<BlockNoteEditorOptions<any, any, any>>;
// };

// export function useBlockNoteSync(
//   syncApi: SyncApi,
//   id: string,
//   opts?: BlockNoteSyncOptions,
// ) {
//   // 1. Get the Tiptap Sync state (loading, initial content, and the colab extension)
//   const sync = useTiptapSync(syncApi, id, opts);

//   // 2. Memoize the editor creation so it only recreates if sync state changes
//   const editor = useMemo(() => {
//     // If we are still loading the doc from Convex, don't create the editor yet
//     if (sync.initialContent === null) return null;

//     // Create a temporary headless editor to parse the ProseMirror JSON into Blocks
//     const tempEditor = BlockNoteEditor.create({
//       ...opts?.editorOptions,
//       _headless: true,
//     });

//     const blocks: Block<any, any, any>[] = [];

//     // Convert ProseMirror content (from Convex) to BlockNote Blocks
//     const pmNode = tempEditor.pmSchema.nodeFromJSON(sync.initialContent);
//     if (pmNode.firstChild) {
//       pmNode.firstChild.descendants((node) => {
//         blocks.push(nodeToBlock(node, tempEditor.pmSchema));
//         return false;
//       });
//     }

//     // 3. Create the ACTUAL editor instance
//     return BlockNoteEditor.create({
//       // Spread the user's custom options (AI Extension, Dictionary, etc.)
//       ...opts?.editorOptions,

//       // Inject the Tiptap Sync Extension
//       _tiptapOptions: {
//         ...opts?.editorOptions?._tiptapOptions,
//         extensions: [
//           ...(opts?.editorOptions?._tiptapOptions?.extensions ?? []),
//           sync.extension, // <--- THE GLUE: Connects Convex to Tiptap
//         ],
//       },
//       // Load the converted blocks
//       initialContent: blocks.length > 0 ? blocks : undefined,
//     });
//   }, [sync.initialContent, opts?.editorOptions]); // Re-run if initial content or options change

//   // 4. Handle Loading State
//   if (sync.isLoading || !editor) {
//     return {
//       editor: null,
//       isLoading: true,
//       create: sync.create,
//     } as const;
//   }

//   // 5. Return the ready editor
//   return {
//     editor: editor,
//     isLoading: false,
//   } as const;
// }
