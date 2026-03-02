
import {  getConvexClient } from "./convex-client";
import { api } from "@workspace/backend/_generated/api";
import { parseBlocks } from "./parse-blocks";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";

// ============================================
// REAL TOOLS — Convex data access
// ============================================

export const listProjectsByUser = async (organizationId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const projects = await client.query(api.projects.getProjectsByOrganization);
        
        return projects.map((p) => ({
            id: p._id,
            name: p.name,
            description: p.description
        }));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
};

export const getProjectInfo = async (projectId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const project = await client.query(api.projects.getProjectById, { 
            projectId: projectId as Id<"projects"> 
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
            documentId: documentId as Id<"documents"> 
        });
        
        return files.map((f) => ({
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

/**
 * Scan all blocks for smartBlockMention inline nodes and fetch each referenced
 * smartblock by its externalId (attrs.blockId) from Convex.
 *
 * Returns a Map<blockId, blockDoc> ready to pass into parseBlocks().
 */
async function resolveSmartBlockMentions(
    blocks: Doc<"blocks">[],
    client: ReturnType<typeof getConvexClient>
): Promise<Map<string, Doc<"blocks">>> {
    // Collect unique blockIds referenced anywhere in the block content arrays
    const mentionIds = new Set<string>();

    for (const block of blocks) {
        if (!Array.isArray(block.content)) continue;
        for (const node of block.content) {
            if (node.type === "smartBlockMention" && node.attrs?.blockId) {
                mentionIds.add(node.attrs.blockId as string);
            }
        }
    }

    const resolved = new Map<string, Doc<"blocks">>();
    if (mentionIds.size === 0) return resolved;

    // Fetch all referenced smartblocks in parallel
    await Promise.all(
        Array.from(mentionIds).map(async (blockId) => {
            try {
                const sb = await client.query(
                    api.requirements.textFileBlocks.getBlockByExternalId,
                    { externalId: blockId }
                );
                if (sb) resolved.set(blockId, sb);
            } catch (err) {
                console.warn(`Could not resolve SmartBlockMention blockId="${blockId}":`, err);
            }
        })
    );

    console.log(`🔗 Resolved ${resolved.size}/${mentionIds.size} SmartBlockMentions`);
    return resolved;
}

export const getFileContent = async (fileId: string, token?: string) => {
    try {
        const client = getConvexClient(token);
        const blocks = await client.query(api.requirements.textFileBlocks.getBlocksByFileId, {
            textFileId: fileId as Id<"text_files">
        });

        // Pre-fetch any smartblocks referenced via smartBlockMention nodes
        const resolvedSBMs = await resolveSmartBlockMentions(blocks, client);

        return {
            blockCount: blocks.length,
            parsedContent: parseBlocks(blocks, resolvedSBMs)
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
