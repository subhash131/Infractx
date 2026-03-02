import { tool } from "@langchain/core/tools";
import z from "zod";
import { getConvexClient } from "../convex-client";
import { api } from "@workspace/backend/_generated/api";

export const createFileTool = tool(async (input, config) => {
    try {
        const token = config.configurable?.token;
        if (!token) throw new Error("No session token provided");
        
        const client = getConvexClient(token);
        const documentId = config.configurable?.documentId;
        if (!documentId) throw new Error("No documentId provided in config");

        const newId = await client.mutation(api.requirements.textFiles.create, {
            title: input.title,
            documentId: documentId as any,
            type: input.type as any,
            parentId: input.parentId ? (input.parentId as any) : undefined
        });
        
        return { success: true, fileId: newId, title: input.title, type: input.type };
    } catch (e: any) {
        console.error("Create File Error:", e);
        return { success: false, error: e.message };
    }
}, {
    name: "create_file",
    description: "Create a new file or folder architecture representation (e.g. backend/schema, frontend/auth). DO NOT use file extensions. Do NOT provide content. Just creates the structural record.",
    schema: z.object({
        title: z.string().describe("Name of the file/folder. Do NOT use file extensions if file."),
        type: z.union([z.literal("FILE"), z.literal("FOLDER")]).describe("Type of the record."),
        parentId: z.string().optional().describe("If nested inside another folder, provide its Convex ID. If it falls back to the document root, leave empty.")
    })
});

export const renameFileTool = tool(async (input, config) => {
    try {
        const token = config.configurable?.token;
        if (!token) throw new Error("No session token provided");
        
        const client = getConvexClient(token);
        await client.mutation(api.requirements.textFiles.updateFile, {
            fileId: input.fileId as any,
            title: input.title
        });
        
        return { success: true, fileId: input.fileId, title: input.title };
    } catch (e: any) {
        console.error("Rename File Error:", e);
        return { success: false, error: e.message };
    }
}, {
    name: "rename_file",
    description: "Rename an existing database file or folder.",
    schema: z.object({
        fileId: z.string().describe("The Convex ID of the file"),
        title: z.string().describe("The new name")
    })
});

export const deleteFileTool = tool(async (input, config) => {
    try {
        const token = config.configurable?.token;
        if (!token) throw new Error("No session token provided");
        
        const client = getConvexClient(token);
        await client.mutation(api.requirements.textFiles.deleteFile, {
            fileId: input.fileId as any
        });
        
        return { success: true, fileId: input.fileId };
    } catch (e: any) {
        console.error("Delete File Error:", e);
        return { success: false, error: e.message };
    }
}, {
    name: "delete_file",
    description: "Delete an existing database file or folder.",
    schema: z.object({
        fileId: z.string().describe("The Convex ID of the file")
    })
});
