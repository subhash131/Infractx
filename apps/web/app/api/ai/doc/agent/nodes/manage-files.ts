import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, callAI, ChatMessage } from "../index";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../convex-client";

export async function manageFiles(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
  console.log("📁 Managing files...");
  
  const { docId, userMessage, sessionToken } = state;
  if (!docId) return { error: "No document ID available." };

  try {
    const client = getConvexClient(sessionToken);

    // 1. Fetch current file tree for context
    const existingFiles = await client.query(api.requirements.textFiles.getFilesByDocumentId, {
      documentId: docId as any
    });

    // Formatting file tree for LLM
    const filesRepresentation = existingFiles.map((f: any) => ({
      id: f._id,
      title: f.title,
      type: f.type,
      parentId: f.parentId
    }));

    const prompt = `
You are a File Management AI Assistant. Your task is to plan file and folder operations based on the user's request.

User Request: "${userMessage}"

Current Document File Tree:
${JSON.stringify(filesRepresentation, null, 2)}

Instructions:
1. Analyze the request. Does the user want to create, delete, rename, move, or generate files/folders?
2. If the user asks for high-level generative docs (e.g., "design a system architecture"), break this down into a low-level, detailed roadmap folder hierarchy and multiple files, providing detailed 'content' for each file. This content is meant for AI coding agents: include detailed backend schemas and actions/APIs, frontend pages with actions linking to the backend, and advanced infrastructure like Kafka or Redis if needed. DO NOT use any file extensions for titles (e.g., no .md, .txt, .tsx).
3. Only use existing parentIds if placing inside existing folders. If creating new nested folders, assign a temporary ID (e.g., "temp_1") to the folder, and use that temporary ID as the parentId for its children.
4. Output a list of operations in valid JSON format. Make sure to escape all newlines in the content strings as \\n.

Supported Operations:
- create: { "action": "create", "type": "FILE" | "FOLDER", "title": string, "parentId"?: string | "temp_X", "tempId"?: "temp_X", "content"?: string (markdown content for files) }
- delete: { "action": "delete", "fileId": string }
- rename: { "action": "rename", "fileId": string, "title": string }
- move: { "action": "move", "fileId": string, "parentId": string | null }

Return ONLY the JSON array (NO MARKDOWN WRAPPERS):
[
  { "action": "create", "type": "FOLDER", "title": "backend", "tempId": "temp_1" },
  { "action": "create", "type": "FILE", "title": "schema", "parentId": "temp_1", "content": "## Database Schema\\n\\n..." }
]
`;

    const messages: ChatMessage[] = state.chatHistory?.length > 0 
      ? state.chatHistory.slice(-5).map((m: any) => ({
          role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
          content: m.content || ""
      }))
      : [];
      
    messages.push({ role: "user" as const, content: prompt });

    const operationsList = await callAI(messages, { returnJson: true, config });
    console.log("File Operations Planned:", operationsList);

    if (!Array.isArray(operationsList)) {
      throw new Error("Invalid output format from LLM, expected array.");
    }

    const tempIdMap = new Map<string, string>(); // Maps tempId to real Convex ID
    let actionCount = 0;

    // 2. Execute Operations
    for (const op of operationsList) {
      if (op.action === "create") {
        let parentIdToUse = op.parentId;
        if (parentIdToUse && parentIdToUse.startsWith("temp_")) {
          parentIdToUse = tempIdMap.get(parentIdToUse);
        }

        const newId = await client.mutation(api.requirements.textFiles.create, {
          title: op.title,
          documentId: docId as any,
          type: op.type,
          parentId: parentIdToUse ? (parentIdToUse as any) : undefined
        });

        if (op.tempId) {
          tempIdMap.set(op.tempId, newId);
        }
        
        // Insert initial block content if provided
        if (op.type === "FILE" && op.content) {
          await client.mutation(api.requirements.textFileBlocks.createBlock, {
            externalId: crypto.randomUUID(),
            textFileId: newId,
            type: "paragraph",
            props: {},
            content: [{ type: "text", text: op.content }],
            rank: "a0",
            approvedByHuman:false
          });
        }
        actionCount++;
      } else if (op.action === "delete") {
        await client.mutation(api.requirements.textFiles.deleteFile, {
          fileId: op.fileId as any
        });
        actionCount++;
      } else if (op.action === "rename" || op.action === "move") {
        await client.mutation(api.requirements.textFiles.updateFile, {
          fileId: op.fileId as any,
          title: op.title,
          parentId: op.parentId !== undefined ? op.parentId : undefined
        });
        actionCount++;
      }
    }

    // 3. Output Chat Response to Frontend
    const summaryMsg = `I have completed ${actionCount} file operation(s) based on your request.`;
    
    return {
      operations: [{
        type: 'chat_response',
        position: state.cursorPosition || 0,
        content: summaryMsg
      }]
    };

  } catch (error) {
    console.error("Manage files failed:", error);
    return { 
      operations: [{
        type: 'chat_response',
        position: state.cursorPosition || 0,
        content: "Sorry, I encountered an error while managing the files."
      }],
      error: "Failed to manage files"
    };
  }
}
