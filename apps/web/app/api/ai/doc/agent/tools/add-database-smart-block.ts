import { tool } from "@langchain/core/tools";
import z from "zod";
import { getConvexClient } from "../convex-client";
import { api } from "@workspace/backend/_generated/api";
import { generateKeyBetween } from "fractional-indexing";

export const addDatabaseSmartBlockTool = tool(async (input, config) => {
    try {
        const token = config.configurable?.token;
        if (!token) throw new Error("No session token provided");
        
        const client = getConvexClient(token);
        
        // Fetch existing blocks to determine the rank
        const existingBlocks = await client.query(api.requirements.textFileBlocks.getBlocksByFileId, {
            textFileId: input.fileId as any
        });
        
        let newRank = "a0";
        if (existingBlocks && existingBlocks.length > 0) {
            // Sort blocks by rank to find the last one
            const sortedBlocks = existingBlocks.sort((a: any, b: any) => a.rank.localeCompare(b.rank));
            const lastBlock = sortedBlocks[sortedBlocks.length - 1];
            newRank = generateKeyBetween(lastBlock?.rank, null);
        } else {
            newRank = generateKeyBetween(null, null);
        }

        const externalId = crypto.randomUUID();

        await client.mutation(api.requirements.textFileBlocks.createBlock, {
            textFileId: input.fileId as any,
            type: "smartBlock",
            props: {},
            content: input.content, // Should be detailed roadmap/pseudo-code JSON or string
            rank: newRank,
            externalId: externalId
        });
        
        return { success: true, fileId: input.fileId, blockId: externalId };
    } catch (e: any) {
        console.error("Add Database Smart Block Error:", e);
        return { success: false, error: e.message };
    }
}, {
    name: "add_database_smart_block",
    description: "Populate a file with detailed roadmap/pseudo-code context for coding agents. This directly mutates the database to add the architectural content.",
    schema: z.object({
        fileId: z.string().describe("The Convex ID of the file to populate. Must be an existing file (not folder)."),
        content: z.string().describe("The detailed system design context, pseudo-code, or schema definitions to inject. Provide comprehensive details as a Markdown string.")
    })
});
