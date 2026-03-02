import { AgentStateAnnotation } from "../index";
import { RunnableConfig } from "@langchain/core/runnables";
import { getFileContent, getProjectInfo, listFiles } from "../context-tools";

export async function fetchFileData(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("📥 Fetching file data...");
    const { targetFileIds } = state;

    if (!targetFileIds || targetFileIds.length === 0) {
        return { error: "No target files selected." };
    }

    let combinedContext = "";

    for (const fileId of targetFileIds) {
        // Fetch specific file content
        const token = config.configurable?.token;
        const { blockCount, parsedContent } = await getFileContent(fileId, token);
        
        combinedContext += `\n\n=== FILE CONTENT: ${fileId} ===\n`;
        combinedContext += parsedContent;
    }

    // Determine if we need to explain schema/code or just list files
    // Ideally we also include file metadata if the query was "what files exist"
    
    return { fetchedContext: combinedContext };
}
