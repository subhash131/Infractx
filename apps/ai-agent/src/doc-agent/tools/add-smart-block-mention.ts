import { tool } from "@langchain/core/tools";
import z from "zod";

export const addSmartBlockMentionTool = tool(async (input) => {
    // We return a specific structure that the Architecture Agent will catch
    // and map into an `EditOperation` for the TipTap editor.
    return {
        _isEditorOperation: true,
        type: 'insert_smartblock_mention',
        content: {
            blockId: input.blockId,
            label: input.label,
            fileId: input.fileId,
            fileName: input.fileName
        }
    };
}, {
    name: "add_smart_block_mention",
    description: "Insert an inline link (smart block mention) into the currently ACTIVE text document being edited by the user. Call this to link the newly generated backend/frontend architectural files into the active editor context.",
    schema: z.object({
        blockId: z.string().describe("The UUID (externalId) of the smart block that was generated. If you don't have one, generate a fast crypto.randomUUID()."),
        label: z.string().describe("The visible text label for the link in the editor (e.g. 'DB Schema')"),
        fileId: z.string().describe("The Convex file ID this link points to"),
        fileName: z.string().describe("The title/name of the file this link points to")
    })
});
