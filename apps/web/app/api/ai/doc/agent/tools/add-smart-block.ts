import { tool } from "@langchain/core/tools";
import z from "zod";

export const addSmartBlock = tool(async (input) => {
    return {
        type: "smartBlock",
        ...input,
    }
}, {
    name: "add_smart_block",
    description: "Add a smart block to the document",
    schema: z.object({
        blockType: z.string().describe("The type of the smart block"),
        content: z.any().describe("The content of the smart block"),
    }),
})