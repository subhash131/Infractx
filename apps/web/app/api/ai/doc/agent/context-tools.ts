
import {  getConvexClient } from "./convex-client";
import { api } from "@workspace/backend/_generated/api";
import { parseBlocks } from "./parse-blocks";

// ============================================
// REAL TOOLS — Convex data access
// ============================================

export const listProjectsByUser = async (organizationId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const projects = await client.query(api.projects.getProjectsByOrganization);
        
        return projects.map((p: any) => ({
            id: p._id,
            name: p.name,
            description: p.description
        }));
    } catch (error: any) {
        console.error("Error fetching projects:", error);
        return [];
    }
};

export const getProjectInfo = async (projectId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const project = await client.query(api.projects.getProjectById, { 
            projectId: projectId as any 
        });
        return project;
    } catch (error) {
        console.error(`Error fetching project ${projectId}:`, error);
        return null;
    }
};

export const listFiles = async (documentId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const files = await client.query(api.requirements.textFiles.getFilesByDocumentId, { 
            documentId: documentId as any 
        });
        
        return files.map((f: any) => ({
            id: f._id,
            title: f.title,
            type: f.type,
            parentId: f.parentId
        }));
    } catch (error) {
        console.error(`Error fetching files for doc ${documentId}:`, error);
        return [];
    }
};

export const getFileContent = async (fileId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const blocks = await client.query(api.requirements.textFileBlocks.getBlocksByFileId, {
            textFileId: fileId as any
        });
        
        // Return both raw count and parsed text
        return {
            blockCount: blocks.length,
            parsedContent: parseBlocks(blocks)
        };
    } catch (error) {
        console.error(`Error fetching content for file ${fileId}:`, error);
        return { blockCount: 0, parsedContent: "Error fetching file content." };
    }
};

export const getSmartBlocks = async (fileId: string, token?: string) => {
     try {
        const client = getConvexClient(token);
        const blocks = await client.query(api.requirements.textFileBlocks.getSmartBlocks, {
             textFileId: fileId as any
        });
         
        return parseBlocks(blocks);
     } catch (error) {
         console.error(`Error fetching smart blocks for file ${fileId}:`, error);
         return "Error fetching smart blocks.";
     }
}
